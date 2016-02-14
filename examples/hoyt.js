var createMicroscope = require('../')
var electron = require('electron')

electron.app.commandLine.appendSwitch('disable-http-cache', true)

electron.app.on('ready', function () {
  createMicroscope(function (err, scope) {
    if (err) throw err
    // clears localstorage state
    scope.window.webContents.session.clearStorageData(function (err) {
      if (err) throw err
      scope.loadURL('http://hoytarboretum.gardenexplorer.org/taxalist.aspx', function (err) {
        if (err) throw err
        console.log('loaded home page')
        loop(scope)
      })
    })
  })
})

function loop (scope) {
  var data = scope.run(clickNextLetter)
  data.on('error', function (e) {
    console.error('Error:', e)
    scope.destroy()
  })
  scope.once('did-fail-load', function (error) {
    console.error('Failed to load', error)
    scope.destroy()
  })
  scope.once('did-finish-load', function () {
    var data = scope.run(getSpecies)
    data.on('data', function (d) {
      console.log('Species', d.toString() ? d.toString() : d)
    })
    data.on('finish', function () {
      console.log('go back')
      scope.window.webContents.executeJavaScript("document.querySelector('webview').goBack()")
      scope.once('did-fail-load', function (error) {
        console.error('Failed to go back', error)
        scope.destroy()
      })
      scope.once('did-finish-load', function () {
        loop(scope)
      })
    })
  })
}

// these two functions are executed on the page, .toString() is called on them!
function getSpecies (send, done) {
  var species = document.querySelectorAll('.taxalist a b')
  for (var i = 0; i < species.length; i++) send(species[i].innerText)
  done()
}

function clickNextLetter (send, done) {
  var links = document.querySelectorAll('.content input[type="button"]')
  var lastClicked = window.localStorage.getItem('last-clicked')
  if (typeof lastClicked === 'undefined') lastClicked = 0
  else lastClicked = +lastClicked
  var link = links[lastClicked]
  if (!link) return done(new Error('clicked all links'))
  window.localStorage.setItem('last-clicked', ++lastClicked)
  link.click()
  done()
}
