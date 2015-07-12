var App = require('app')
var microscope = require('./index.js')

App.on('ready', load)

function load () {
  var scope = microscope({}, function ready (err) {
    scope.load('http://hoytarboretum.gardenexplorer.org/taxalist.aspx')
    loop()
  })  
  
  function loop () {
    scope.domReady(function (err) {
      if (err) return exit(err)
      scope.eval(clickNextLetter, function (err, data) {
        if (err) return exit(err)
        if (data && data.clickedAll) return scope.window.close()
        scope.domReady(function (err) {
          if (err) return exit(err)
          scope.eval(function (stream) {
            var species = document.querySelectorAll('.taxalist a b')
            for (var i = 0; i < species.length; i++) stream.write(species[i].innerText)
            stream.end()
          }, function (err) {
            if (err) return exit(err)
            scope.window.webContents.goBack()
            loop()
          })
        })
      })
    })
  }
  
  function clickNextLetter(stream) {
    var links = document.querySelectorAll('.content input[type="button"]')
    var lastClicked = localStorage.getItem('last-clicked')
    if (typeof lastClicked === 'undefined') lastClicked = 0
    else lastClicked = +lastClicked
    var link = links[lastClicked]
    if (!link) return stream.destroy(new Error('clicked all links'))
    localStorage.setItem('last-clicked', ++lastClicked)
    link.click()
    stream.end()
  }
  
  function exit (err) {
    console.error(err)
    // scope.window.close()
  }
}
