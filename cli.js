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

App.commandLine.appendSwitch('v', -1)
App.commandLine.appendSwitch('vmodule', 'console=0')

App.on('ready', load)

function load () {
  microscope(BrowserWindow, url, function (err, win, resp, cb) {
    var id = uuid()
    
    ipc.on(id + '-done', function () {
      cb()
    })
    
    win.webContents.executeJavaScript(wrapRPC(script))

    function wrapRPC (fn) {
      return ";(function () { " + fn + "; require('ipc').send('" + id + "-done', true); })();"
    }
  })
}
