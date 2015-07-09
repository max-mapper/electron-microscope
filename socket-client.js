var websocket = require('websocket-stream')
var ws = websocket('[[REPLACE-WITH-SERVER]]')
var ELECTRON_MICROSCOPE_UNIQUE_ID = '[[REPLACE-WITH-ID]]'

ws.on('data', function (d) {
  console.log('in client', d.toString())
  var data
  try {
    data = JSON.parse(d)
  } catch (e) {
    data = {}
  }
  if (!data.id) return console.error('invalid message ' + d)
  if (data.id !== ELECTRON_MICROSCOPE_UNIQUE_ID) return console.error('ID mismatch', data.id, ELECTRON_MICROSCOPE_UNIQUE_ID)
  if (data.script) return runUserScript(data.script)
  console.error('unknown message', d)
})

function runUserScript (code) {
  function send (msg) { ws.write(JSON.stringify({id: ELECTRON_MICROSCOPE_UNIQUE_ID, message: msg})) }
  function done () { ws.write(JSON.stringify({id: ELECTRON_MICROSCOPE_UNIQUE_ID, done: true})) }
  var _eval = eval
  _eval('(' + code + ')()')
}

ws.write(JSON.stringify({id: ELECTRON_MICROSCOPE_UNIQUE_ID, ready: true}))