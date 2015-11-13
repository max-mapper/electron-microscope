var App = require('app')
var microscope = require('./index.js')

App.on('ready', load)

function load () {
  var scope = microscope({https: false, insecure: true}, function ready (err) {
    scope.loadUrl('https://github.com/maxogden/dat', function (err) {
      if (err) throw err
      var data = scope.createEvalStream(function (stream) {
        var button = document.querySelector('li[aria-label="Issues"]')
        console.log(button)
        button.click()
        stream.end()
      })
    })
  })
}