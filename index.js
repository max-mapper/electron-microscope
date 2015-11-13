var fs = require('fs')
var path = require('path')
var events = require('events')
var uuid = require('hat')
var through = require('through2')
var BrowserWindow = require('browser-window')
var extend = require('xtend')
var debug = require('debug')('electron-microscope')
var createBridge = require('./bridge.js')

var clientBundle = fs.readFileSync('./socket-client-bundle.js').toString()

module.exports = Microscope

function Microscope (opts, ready) {
  if (!(this instanceof Microscope)) return new Microscope(opts, ready)
  if (typeof opts === 'function') {
    ready = opts
    opts = undefined
  }
  var self = this

  if (typeof opts.insecure === 'undefined') opts.insecure = false
  if (typeof opts.https === 'undefined') opts.https = true
  var winOpts = extend({
    "webPreferences": {
      "webSecurity": !opts.insecure,
      "allowRunningInsecureContent": true,
      "allowDisplayingInsecureContent": true
      // "preload": path.resolve(__dirname, 'preload.js') // preload is currently unusable for us (electron/issues/1117)
    },
    "nodeIntegration": true // WARNING this is a security issue. refer to maxogden/electron-microscope/issues/4
  }, opts)

  this.window = new BrowserWindow(winOpts)
  
  this.opts = opts || {}
  this.opts.limit = this.opts.limit || 10000

  createBridge(this.opts, function (err, bridge) {
    if (err) return ready(err)
    self.bridge = bridge
    ready()
  })
}

Microscope.prototype.loadUrl = function (url, opts, cb) {
  var self = this
  if (typeof opts === 'function') {
    cb = opts
    opts = undefined
  }
  this.window.loadUrl(url, opts)
  this.window.webContents.executeJavaScript("require('web-frame').registerUrlSchemeAsPrivileged('ws')")
  if (cb) this.onload(cb)
}

Microscope.prototype.onload = function (cb) {
  var self = this
  var limit = this.opts.limit
  var finished = false

  var limitInterval = setTimeout(function () {
    if (finished) return
    finished = true
    cb(new Error('Timed out'))
  }, limit)

  var responseDetails
  self.window.webContents.once('did-get-response-details', function (event, status, newUrl, originalUrl, respCode, method, referrer, headers) {
    debug('got response details')
    responseDetails = {
      status: status,
      url: newUrl,
      originalUrl: originalUrl,
      statusCode: respCode,
      method: method,
      referrer: referrer,
      headers: headers
    }
  })
  
  self.window.webContents.once('did-finish-load', function (ev) {
    debug('did-finish-load')
    clearTimeout(limitInterval)
    finished = true
    cb(null, responseDetails)
  })

  self.window.webContents.once('did-fail-load', function (ev, code, desc) {
    debug('did-fail-load')
    if (finished) return
    finished = true
    cb(new Error(desc))
  })
}

Microscope.prototype.createEvalStream = function (script) {
  var self = this

  if (typeof script === 'function') script = script.toString()

  // algorithm:
  // - each window gets a unique id
  // - we embed id in script, run script on page
  // - script tells us its ready
  // - we send back the users script for the page to eval

  var id = uuid()
  var limit = this.opts.limit
  var gotReady = false
  var timedOut = false
  var stream = through.obj()

  var limitInterval = setTimeout(function () {
    if (gotReady) return
    timedOut = true
    stream.destroy(new Error('Timed out'))
  }, limit)

  // when our rpc code has executed it will call this
  self.bridge.on(id + '-ready', function () {
    debug('bridge ready')
    if (timedOut) return
    gotReady = true
    self.bridge.activeSocket.write({id: id, script: script})
  })

  self.bridge.on(id + '-data', function (data) {
    if (timedOut) return
    stream.push(data)
  })

  self.bridge.on(id + '-error', function (err) {
    if (timedOut) return
    stream.destroy(err)
  })

  // user code is done, we can dispose of window
  self.bridge.on(id + '-finish', function () {
    if (timedOut) return
    stream.end()
  })

  var prefix = this.opts.https ? 'wss' : 'ws'

  // run our rpc code on page
  var clientScript = clientBundle
    .replace('[[REPLACE-WITH-SERVER]]', prefix + '://localhost:' + self.bridge.httpPort)
    .replace('[[REPLACE-WITH-ID]]', id)

  self.window.webContents.executeJavaScript(clientScript)

  return stream
}
