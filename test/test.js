var test = require('tape')
var concat = require('concat-stream')
var microscope = require('../')
var electron = require('electron')
var execspawn = require('npm-execspawn')

electron.app.commandLine.appendSwitch('disable-http-cache', true)

var server

test('wait for electron', function (t) {
  electron.app.on('window-all-closed', function () {
    // disable default
  })
  electron.app.on('ready', function () {
    t.ok(true, 'electron ready')
    t.end()
  })
})

test('start test server', function (t) {
  server = execspawn('http-server ./ -p 54321', {cwd: __dirname})
  server.stdout.once('data', function (ch) {
    if (ch.toString().indexOf('Starting up') > -1) t.ok(true, 'server started')
    else t.ok(false, ch)
    t.end()
  })
})

test('basic', function (t) {
  var scope = microscope(function (err) {
    if (err) t.ifError(err)
    scope.loadURL('http://localhost:54321', function (err) {
      if (err) t.ifError(err)
      var output = scope.run(function (send, done) {
        send(document.querySelector('.foo').innerText)
        done()
      })
      output.pipe(concat(function (out) {
        t.equal(out.toString(), 'bar', 'output matched')
        scope.destroy()
        t.end()
      }))
    })
  })
})

test('stop server', function (t) {
  server.kill()
  server.on('close', function () {
    t.ok(true, 'test server closed')
    t.end()
    electron.app.quit()
  })
})
