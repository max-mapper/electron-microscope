var fs = require('fs')
var path = require('path')
var http = require('http')
var events = require('events')
var websocket = require('websocket-stream')
var getport = require('getport')
var uuid = require('hat')
var ndjson = require('ndjson')
var pump = require('pump')
var duplex = require('duplexify')
var through = require('through2')
var BrowserWindow = require('browser-window')
var debug = require('debug')('electron-microscope')

var clientBundle = fs.readFileSync('./socket-client-bundle.js').toString()

module.exports = Microscope

function Microscope (opts, ready) {
  if (!(this instanceof Microscope)) return new Microscope(opts, ready)
  if (typeof opts === 'function') {
    ready = opts
    opts = undefined
  }
  var self = this
    
  this.http = http.createServer()
  this.emitter = new events.EventEmitter()
  this.websocket = websocket.createServer({server: this.http}, function (socket) {
    self.activeSocket = ndjson.serialize()
    pump(self.activeSocket, socket)
    var handlerStream = through.obj(function(data, enc, next) {
      debug('client message', data)
      if (!data.id) {
        console.error('invalid message ' + d)
        return next()
      }
      if (data.ready) {
        self.emitter.emit(data.id + '-ready')
        return next()
      } else if (data.done) {
        self.emitter.emit(data.id + '-done')
        return next()
      } else {
        self.emitter.emit(data.id + '-message', data.message)
        return next()
      }
    })
    pump(socket, ndjson.parse(), handlerStream)
  })
  
  getport(function (e, p) {
    if (e) return ready(e)
    self.httpPort = p
    self.http.listen(p, ready)
  })

  this.window = new BrowserWindow({
    "web-preferences": {
      "web-security": true
    },
    "node-integration": false,
    show: true
  })

  this.opts = opts || {}
  this.opts.limit = this.opts.limit || 100000
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
  self.emitter.on(id + '-ready', function () {
    if (timedOut) return
    gotReady = true
    self.activeSocket.write({id: id, script: script})
  })

  self.emitter.on(id + '-message', function (data) {
    if (timedOut) return
    console.log(JSON.stringify(data))
  })

  // user code is done, we can dispose of window
  self.emitter.on(id + '-done', function (err) {
    if (err) return cb(err)
    if (timedOut) return
    cb()
  })

  // run our rpc code on page
  var clientScript = clientBundle
    .replace('[[REPLACE-WITH-SERVER]]', 'ws://localhost:' + self.httpPort)
    .replace('[[REPLACE-WITH-ID]]', id)
  
  self.window.webContents.executeJavaScript(clientScript)
}
