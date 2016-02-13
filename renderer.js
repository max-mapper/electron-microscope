var electron = require('electron')
var domify = require('domify')

module.exports = function () {
  electron.ipcRenderer.on('load-url', function (event, url) {
    var webview = domify('<webview src="' + url + '" preload="./webview.js"></webview>')
    document.body.innerHTML = ''
    document.body.appendChild(webview)
    webview.addEventListener('did-start-loading', function () {
      electron.ipcRenderer.send('webview-event', 'did-start-loading')
    })
    webview.addEventListener('did-stop-loading', function () {
      electron.ipcRenderer.send('webview-event', 'did-stop-loading')
      electron.ipcRenderer.send('done-loading')
    })
    webview.addEventListener('will-navigate', function (newUrl) {
      electron.ipcRenderer.send('webview-event', 'will-navigate', newUrl)
    })
  })

  electron.ipcRenderer.on('run', function (event, id, code) {
    console.log('running', id, code)
    var webview = document.querySelector('webview')
    webview.addEventListener('ipc-message', onIPC)

    function onIPC (event) {
      console.log('IPC', event.channel, id, event.args)
      electron.ipcRenderer.send.apply(null, [id + '-' + event.channel].concat(event.args))
      if (event.channel === 'done-running') {
        webview.removeEventListener('ipc-message', onIPC)
      }
    }

    webview.executeJavaScript(ipcWrap(code))
  })
}

function ipcWrap (code) {
  return ';(' + code + ')(ELECTRON_MICROSCOPE_SEND, ELECTRON_MICROSCOPE_DONE)'
}
