var fs = require('fs')
var path = require('path')
var events = require('events')
var uuid = require('hat')
var BrowserWindow = require('browser-window')
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

  this.window = new BrowserWindow({
    "web-preferences": {
      "web-security": true
    },
    "node-integration": false,
    show: true
  })

  this.opts = opts || {}
  this.opts.limit = this.opts.limit || 100000
  
  createBridge(function (err, bridge) {
    if (err) return ready(err)
    self.bridge = bridge
    ready()
  })
}

Microscope.prototype.load = function (url, opts, cb) {
  var self = this
  if (typeof opts === 'function') {
    cb = opts
    opts = undefined
  }
  this.window.loadUrl(url, opts)
  if (cb) this.domReady(cb)
}

Microscope.prototype.domReady = function (cb) {
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
  
  self.window.webContents.once('dom-ready', function (ev) {
    clearInterval(limitInterval)
    
    cb(null, responseDetails)
  })
  
  self.window.webContents.once('did-fail-load', function (ev, code, desc) {
    if (finished) return
    finished = true
    cb(new Error(desc))
  })
}

Microscope.prototype.eval = function (script, cb) {
  var self = this
  
  if (typeof script === 'function') script = script.toString()

  // current method (suggest a better one plz):
  // - each window gets a unique id
  // - we embed id in script, run script on page
  // - script tells us its ready
  // - we send the http response data (first arg to user fn)
  // - we print <id>-message data to stdout
  // - when user calls done() we can close the window
  
  var id = uuid()
  var limit = this.opts.limit
  var gotReady = false
  var timedOut = false
  
  var limitInterval = setTimeout(function () {
    if (gotReady) return
    timedOut = true
    cb(new Error('Timed out'))
  }, limit)
  
  // when our rpc code has executed it will call this
  self.bridge.on(id + '-ready', function () {
    if (timedOut) return
    gotReady = true
    self.bridge.activeSocket.write({id: id, script: script})
  })

  self.bridge.on(id + '-message', function (data) {
    if (timedOut) return
    console.log(JSON.stringify(data))
  })

  // user code is done, we can dispose of window
  self.bridge.on(id + '-done', function (err) {
    if (err) return cb(err)
    if (timedOut) return
    cb()
  })

  // run our rpc code on page
  var clientScript = clientBundle
    .replace('[[REPLACE-WITH-SERVER]]', 'ws://localhost:' + self.bridge.httpPort)
    .replace('[[REPLACE-WITH-ID]]', id)
  
  self.window.webContents.executeJavaScript(clientScript)
}
