var App = require('app')
var microscope = require('./index.js')

App.on('ready', load)

function load () {
  var scope = microscope()
  
  scope.window.loadUrl('http://hoytarboretum.gardenexplorer.org/taxalist.aspx')
  
  loop()
  
  function loop () {
    scope.domReady(function (err, resp) {
      if (err) return exit(err)
      scope.eval(clickNextLetter, function (err, data) {
        if (err) return exit(err)
        if (data && data.clickedAll) return scope.window.close()
        scope.domReady(function (err, resp) {
          if (err) return exit(err)
          scope.eval(function (send, done) {
            var species = document.querySelectorAll('.taxalist a b')
            for (var i = 0; i < species.length; i++) send(species[i].innerText)
            done()
          }, function (err) {
            if (err) return exit(err)
            scope.window.webContents.goBack()
            loop()
          })
        })
      })      
    })
  }
  
  function exit (err) {
    console.error(err)
    // scope.window.close()
  }
  
  function clickNextLetter(send, done) {
    var links = document.querySelectorAll('.content input[type="button"]')
    var lastClicked = localStorage.getItem('last-clicked')
    if (!lastClicked) lastClicked = 0
    var link = links[lastClicked]
    if (!link) return done({clickedAll: true})
    localStorage.setItem('last-clicked', ++lastClicked)
    link.click()
    links[0].click()
    done()
  }
}
