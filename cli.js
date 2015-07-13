#!/usr/bin/env electron

var fs = require('fs')

var url = process.argv[2]
var scriptPath = process.argv[3]

if (!url || !scriptPath) {
  console.error('Usage: electron-microscope <url> <script>')
  process.exit(1)
}

var script = fs.readFileSync(scriptPath).toString()
  
var App = require('app')
var microscope = require('./index.js')

App.on('ready', load)

function load () {
  var scope = microscope(function ready (err) {
    if (err) throw err
    scope.load(url, function (err, resp) {
      var data = scope.eval(script)
      data.pipe(process.stdout)
      data.on('finish', function () {
        scope.window.close()
      })
    })
  })
}
