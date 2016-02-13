var electron = require('electron')
var domify = require('domify')

module.exports = function () {
  electron.ipcRenderer.on('load-url', function (event, url) {
    var webview = domify('<webview src="' + url + '" preload="./webview.js"></webview>')
    document.body.innerHTML = ''
    document.body.appendChild(webview)
    webview.addEventListener('will-navigate', function (newUrl) {
      electron.ipcRenderer.send('webview-event', 'will-navigate', newUrl)
    })
    webview.addEventListener('did-finish-load', function () {
      electron.ipcRenderer.send('webview-event', 'did-finish-load')
      electron.ipcRenderer.send('webview-did-finish-load')
    })
    webview.addEventListener('did-fail-load', function (error) {
      electron.ipcRenderer.send('webview-event', 'did-fail-load', error)
      electron.ipcRenderer.send('webview-did-finish-load', error)
    })
    webview.addEventListener('did-start-loading', function () {
      electron.ipcRenderer.send('webview-event', 'did-start-loading')
    })
    webview.addEventListener('did-stop-loading', function () {
      electron.ipcRenderer.send('webview-event', 'did-stop-loading')
    })
  })

  electron.ipcRenderer.on('run', function (event, id, code) {
    var webview = document.querySelector('webview')
    webview.addEventListener('ipc-message', onIPC)

    function onIPC (event) {
      electron.ipcRenderer.send.apply(null, [id + '-' + event.channel].concat(event.args))
      if (event.channel === 'done-running') {
        webview.removeEventListener('ipc-message', onIPC)
      }
    }

    webview.executeJavaScript(ipcWrap(code))
  })
}

function ipcWrap (code) {
  return `;(function () {
  try {
    (${code})(ELECTRON_MICROSCOPE_SEND, ELECTRON_MICROSCOPE_DONE)
  } catch (err) {
    ELECTRON_MICROSCOPE_DONE(JSON.stringify({message: err.message, stack: err.stack}))
  }
})();
`
}
