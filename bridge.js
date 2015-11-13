var http = require('http')
var https = require('https')
var events = require('events')
var getport = require('getport')
var through = require('through2')
var websocket = require('websocket-stream')
var ndjson = require('ndjson')
var pump = require('pump')
var pem = require('pem')
var debug = require('debug')('electron-microscope/bridge')
var debugStream = require('debug-stream')('electron-microscope/bridge')

module.exports = function (opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  debug('creating server', {https: opts.https})
  if (!opts.https) createSocket(http.createServer()) // no handler, just exists for websocket server
  else pem.createCertificate({days: 999, selfSigned: true}, function (err, keys) {
    if (err) return cb(err)
    createSocket(https.createServer({key: keys.serviceKey, cert: keys.certificate}))
  })

  function createSocket (server) {
    var emitter = new events.EventEmitter()
    emitter.httpServer = server
    emitter.websocketServer = websocket.createServer({server: emitter.httpServer}, handleSocket)

    function handleSocket (socket) {
      debug('new socket')
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
        } else if (data.error) {
          emitter.emit(data.id + '-error', data.error)
          return next()
        } else if (data.finish) {
          emitter.emit(data.id + '-finish')
          return next()
        } else {
          emitter.emit(data.id + '-data', data.data)
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
        debug('listening on ' + p)
        cb(null, emitter)
      })
    })
  }
}