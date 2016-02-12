var electron = require('electron')
var domify = require('domify')

module.exports = function () {
  electron.ipcRenderer.on('load-url', function (event, url) {
    console.log('load webview', url)
    var webview = domify('<webview src="' + url + '" preload="./webview.js"></webview>')
    document.body.innerHTML = ''
    document.body.appendChild(webview)
    webview.addEventListener('did-start-loading', function () {
      console.log('did start loading', url)
    })
    webview.addEventListener('did-stop-loading', function () {
      console.log('did stop loading')
      electron.ipcRenderer.send('done-loading')
    })
  })

  electron.ipcRenderer.on('run', function (event, code) {
    var webview = document.querySelector('webview')
    webview.addEventListener('ipc-message', function (event) {
      electron.ipcRenderer.send.apply(null, [event.channel].concat(event.args))
    })
    webview.executeJavaScript(ipcWrap(code))
  })
}

function ipcWrap (code) {
  return ';(' + code + ')(ELECTRON_MICROSCOPE_SEND, ELECTRON_MICROSCOPE_DONE)'
}
