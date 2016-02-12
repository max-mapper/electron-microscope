window.ELECTRON_MICROSCOPE_IPC = require('ipc')

window.ELECTRON_MICROSCOPE_SEND = function send (obj) {
  window.ELECTRON_MICROSCOPE_IPC.sendToHost('send-data', obj)
}

window.ELECTRON_MICROSCOPE_DONE = function done () {
  window.ELECTRON_MICROSCOPE_IPC.sendToHost('done-running')
}
