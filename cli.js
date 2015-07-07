#!/usr/bin/env electron

var fs = require('fs')

var url = process.argv[2]
var scriptPath = process.argv[3]

if (!url || !scriptPath) {
  console.error('Usage: electron-microscope <url> <script>')
  process.exit(1)
}

var script = fs.readFileSync(scriptPath)
  
var App = require('app')
var BrowserWindow = require('browser-window')
var ipc = require('ipc')

var uuid = require('hat')

var microscope = require('./index.js')

App.on('ready', load)

function load () {
  microscope(BrowserWindow, url, function domReady (err, win, resp, cb) {
    // current method (suggest a better one plz):
    // - each window gets a unique id
    // - we embed id in script, run script on page
    // - script tells us its ready
    // - we send the http response data (first arg to user fn)
    // - we print <id>-message data to stdout
    // - when user calls done() we can close the window
    
    var id = uuid()
    
    // when our rpc code has executed it will call this
    ipc.on(id + '-ready', function () {
      win.webContents.send('response', resp)
    })
    
    ipc.on(id + '-message', function (ev, data) {
      console.log(JSON.stringify(data))
    })
    
    // user code is done, we can dispose of window
    ipc.on(id + '-done', function () {
      cb()
    })
    
    // run our rpc code on page (not synchronous)
    win.webContents.executeJavaScript(wrapRPC(script))

    function wrapRPC (fn) {
      return ";(function() {\n"
        + "var __ELECTRON_IPC = require('ipc');\n" 
        + "function __ELECTRON_IPC_SEND (msg) { __ELECTRON_IPC.send('" + id + "-message', msg) };\n"
        + "function __ELECTRON_IPC_DONE () { __ELECTRON_IPC.send('" + id + "-done', true) };\n"
        + "__ELECTRON_IPC.on('response', function (__ELECTRON_IPC_RESP) {"
        + '  (' + fn + ")(__ELECTRON_IPC_RESP, __ELECTRON_IPC_SEND, __ELECTRON_IPC_DONE)"
        + "});"
        + "__ELECTRON_IPC.send('" + id + "-ready', true);"
        + "})();\n"
    }
  })
}
