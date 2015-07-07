var uuid = require('hat')
var path = require('path')
var BrowserWindow = require('browser-window')
var ipc = require('ipc')

module.exports = Microscope

function Microscope (opts) {
  if (!(this instanceof Microscope)) return new Microscope(opts)

  this.window = new BrowserWindow({
    "web-preferences": {
      "web-security": true
    },
    "node-integration": false,
    preload: path.resolve(path.join(__dirname, 'preload.js')),
    show: true
  })

  this.opts = opts || {}
  this.opts.limit = this.opts.limit || 10000
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
  ipc.on(id + '-ready', function () {
    if (timedOut) return
    gotReady = true
    self.window.webContents.send('response', true)
  })
  
  ipc.on(id + '-message', function (ev, data) {
    if (timedOut) return
    console.log(JSON.stringify(data))
  })
  
  // user code is done, we can dispose of window
  ipc.on(id + '-done', function () {
    if (timedOut) return
    cb()
  })
  
  // run our rpc code on page (not synchronous)
  self.window.webContents.executeJavaScript(wrapRPC(script))

  function wrapRPC (fn) {
    return ";(function() {\n"
      + "  function __ELECTRON_IPC_SEND (msg) { ELECTRON_IPC.send('" + id + "-message', msg) };\n"
      + "  function __ELECTRON_IPC_DONE (msg) { ELECTRON_IPC.send('" + id + "-done', true, msg) };\n"
      + "  ELECTRON_IPC.on('response', function () {"
      + '    (' + fn + ")(__ELECTRON_IPC_SEND, __ELECTRON_IPC_DONE)"
      + "  });"
      + "  ELECTRON_IPC.send('" + id + "-ready', true);"
      + "})();\n"
  }
}
