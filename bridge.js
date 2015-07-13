var http = require('http')
var events = require('events')
var getport = require('getport')
var through = require('through2')
var websocket = require('websocket-stream')
var ndjson = require('ndjson')
var pump = require('pump')
var debug = require('debug')('electron-microscope/bridge')
var debugStream = require('debug-stream')('electron-microscope/bridge')

module.exports = function (cb) {
  var emitter = new events.EventEmitter()
  
  emitter.httpServer = http.createServer() // no handler, just exists for websocket server
  emitter.websocketServer = websocket.createServer({server: emitter.httpServer}, handleSocket)
  
  function handleSocket (socket) {
    emitter.activeSocket = ndjson.serialize()
    pump(emitter.activeSocket, debugStream('to client: %s'), socket)
    var handlerStream = through.obj(function(data, enc, next) {
      if (!data.id) {
        console.error('invalid message ' + d)
        return next()
      }
      if (data.ready) {
        emitter.emit(data.id + '-ready')
        return next()
      } else if (data.done) {
        emitter.emit(data.id + '-done')
        return next()
      } else {
        emitter.emit(data.id + '-message', data.message)
        return next()
      }
    })
    pump(socket, debugStream('from client: %s'), ndjson.parse(), handlerStream)
  }
  
  getport(function (err, p) {
    if (err) return cb(err)
    emitter.httpPort = p
    emitter.httpServer.listen(p, function (err) {
      if (err) return cb(err)
      cb(null, emitter)
    })
  })
}
