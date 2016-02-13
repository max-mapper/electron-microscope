var path = require('path')
var electron = require('electron')
var through = require('through2')
var BrowserWindow = electron.BrowserWindow

module.exports = Microscope

function Microscope (opts, ready) {
  if (!(this instanceof Microscope)) return new Microscope(opts, ready)
  if (typeof opts === 'function') {
    ready = opts
    opts = {}
  }
  this.opts = opts || {}
  this.window = new BrowserWindow({
    width: 800,
    height: 600,
    show: false
  })
  this.window.loadURL(path.join('file://', __dirname, 'window.html'))
  this.window.webContents.once('did-finish-load', function () {
    ready()
  })
  this.window.webContents.once('did-fail-load', ready)
}

Microscope.prototype.loadURL = function (url, cb) {
  this.window.send('load-url', url)
  if (cb) {
    electron.ipcMain.once('done-loading', function (event, err) {
      cb(err)
    })
  }
}

Microscope.prototype.run = function (code) {
  if (typeof code === 'function') code = code.toString()
  var outStream = through()
  this.window.send('run', code)
  electron.ipcMain.on('send-data', function (event, data) {
    outStream.push(data)
  })
  electron.ipcMain.once('done-running', function (event, err) {
    if (err) outStream.destroy(err)
    else outStream.end()
  })
  return outStream
}

Microscope.prototype.destroy = function () {
  this.window.close()
}
