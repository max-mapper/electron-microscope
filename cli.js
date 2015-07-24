#!/usr/bin/env electron

var fs = require('fs')
var minimist = require('minimist')
var args = minimist(process.argv.slice(2), {
  boolean: ['show', 'insecure', 'https'],
  default: { show: false, insecure: false, https: true }
})

var url = args._[0]
var scriptPath = args._[1]

if (!url && (!scriptPath || (!args.eval && !args.script))) {
  console.error('Usage: electron-microscope <url> [<script> --eval="code"]')
  process.exit(1)
}

var script = args.script
if (args.eval) script = 'function scraper (stream) { stream.write(' + args.eval + '); stream.end() }'
if (scriptPath) script = fs.readFileSync(scriptPath).toString()

var App = require('app')
var microscope = require('./index.js')
var ndjson = require('ndjson')

App.commandLine.appendSwitch('ignore-certificate-errors', true)

App.on('ready', load)

function load () {
  var scope = microscope(args, function ready (err) {
    if (err) throw err

    // loads the url and waits for the dom-ready event
    scope.loadUrl(url, function (err, resp) {
      if (err) throw err
      var data = scope.createEvalStream(script)
      
      // print data to console as ndjson
      data.pipe(ndjson.serialize()).pipe(process.stdout)
      
      // close window when done (exits process)
      data.on('finish', function () {
        scope.window.close()
      })
      
      // handle errors from script
      data.on('error', function (e) {
        console.error('Error!', e)
        scope.window.close()
      })
    })
  })
}
