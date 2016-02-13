var test = require('tape')
var concat = require('concat-stream')
var pump = require('pump')
var createMicroscope = require('../')
var electron = require('electron')
var execspawn = require('npm-execspawn')

electron.app.commandLine.appendSwitch('disable-http-cache', true)

var server, scope

test('wait for electron', function (t) {
  electron.app.on('window-all-closed', function () {
    server.kill()
    server.on('close', function () {
      electron.app.quit()
    })
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

test('retrieve the innerText of a div', function (t) {
  createMicroscope(function (err, newScope) {
    scope = newScope
    if (err) t.ifError(err)
    scope.loadURL('http://localhost:54321', function (err) {
      if (err) t.ifError(err)
      var scraper = `function (send, done) {
        send(document.querySelector('.foo').innerText)
        done()
      }`
      var output = scope.run(scraper)
      output.pipe(concat(function (out) {
        t.equal(out.toString(), 'bar', 'output matched')
        t.end()
      }))
    })
  })
})

test('invalid code causes stream error', function (t) {
  scope.loadURL('http://localhost:54321/cool.html', function (err) {
    if (err) t.ifError(err)
    var code = 'function () { donkeys() }'
    var output = scope.run(code)
    var concatter = concat(function (out) {
      t.ok(false, 'should not get here')
    })
    pump(output, concatter, function (err) {
      t.equal(err.message, 'donkeys is not defined', 'got error message')
      t.ok(!!err.stack, 'error has .stack')
      t.end()
    })
  })
})

test('load a new page', function (t) {
  scope.loadURL('http://localhost:54321/cats.html', function (err) {
    if (err) t.ifError(err)
    var scraper = `function (send, done) {
      document.querySelector('a.cool-button').click()
      done()
    }`
    var output = scope.run(scraper)
    output.pipe(concat(function (out) {
      t.equal(out.toString(), '', 'no output')
    }))
    scope.on('will-navigate', function (newUrl) {
      t.equal(newUrl.url, 'http://localhost:54321/cool.html', 'navigating to cool.html')
    })
    scope.on('did-finish-load', function () {
      t.ok(true, 'stopped loading')
      var coolScraper = `function (send, done) {
        send(document.querySelector('.foo').innerText)
        done()
      }`
      var coolOutput = scope.run(coolScraper)
      coolOutput.pipe(concat(function (out) {
        t.equal(out.toString(), 'cool', 'got cool')
        scope.destroy()
        t.end()
      }))
    })
  })
})
