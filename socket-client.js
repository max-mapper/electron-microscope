var websocket = require('websocket-stream')
var through = require('through2')
var ndjson = require('ndjson')
var pump = require('pump')
var duplex = require('duplexify')

var socket = websocket('[[REPLACE-WITH-SERVER]]')
var ELECTRON_MICROSCOPE_UNIQUE_ID = '[[REPLACE-WITH-ID]]'
var alreadyRunningScript = false

var wrapperStream = through.obj(function (obj, enc, cb) {
  this.push({id: ELECTRON_MICROSCOPE_UNIQUE_ID, message: obj})
  cb()
}, function done (cb) {
  this.push({id: ELECTRON_MICROSCOPE_UNIQUE_ID, done: true})
  cb()
})

var unwrapperStream = through.obj(function (data, enc, next) {
  if (!data.id) return next(new Error('invalid message ' + d))
  if (data.id !== ELECTRON_MICROSCOPE_UNIQUE_ID) return next(new Error('ID mismatch: ' +  data.id + ', ' + ELECTRON_MICROSCOPE_UNIQUE_ID))
  if (data.script) {
    if (alreadyRunningScript) return next(new Error('cannot run multiple scripts in the same eval call'))
    alreadyRunningScript = true
    eval('(' + data.script + ')(wrapperStream)')
    return next()
  }
  console.error('unknown message', d)
})

var serializer = ndjson.serialize()
var parser =  ndjson.parse()

pump(wrapperStream, serializer, socket)
pump(socket, parser, unwrapperStream)

serializer.write({id: ELECTRON_MICROSCOPE_UNIQUE_ID, ready: true})

// userStream.on('error', function (err) {
//   socket.write(JSON.stringify({id: ELECTRON_MICROSCOPE_UNIQUE_ID, error: err.message}))
//   socket.end()
// })