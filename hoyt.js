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
      var data = scope.eval(clickNextLetter)
      data.on('data', function (d) {
        if (d.clickedAll) return scope.window.close()
        console.log(JSON.stringify(d.data))
      })
      data.on('finish', function () {
        scope.domReady(function (err) {
          if (err) return exit(err)
          var data = scope.eval(getSpecies)
          data.on('data', function (d) {
            console.log(d)
          })
          data.on('finish', function () {
            scope.window.webContents.goBack()
            loop()
          })
        })
      })
    })
  }
  
  // these two functions are executed on the page, .toString() is called on them!
  function getSpecies (stream) {
    var species = document.querySelectorAll('.taxalist a b')
    for (var i = 0; i < species.length; i++) stream.write(species[i].innerText)
    stream.end()
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
