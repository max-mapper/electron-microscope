var test = require('tape')
var spawn = require('tape-spawn')
var execspawn = require('npm-execspawn')

var server

test('start test server', function (t) {
  server = execspawn('http-server ./ -p 54321', {cwd: __dirname})
  server.stdout.once('data', function (ch) {
    if (ch.toString().indexOf('Starting up') > -1) t.ok(true, 'server started')
    else t.ok(false, ch)
    t.end()
  })
})

test('script arg', function (t) {
  var cmd = 'electron cli.js http://localhost:54321/a.html test/script.js'
  var scope = spawn(t, cmd, {cwd: __dirname + '/../'})
  scope.stdout.match('"foo"\n')
  scope.end()
})

test('--script option', function (t) {
  var cmd = 'electron cli.js http://localhost:54321/a.html --script="function(s){s.end(document.querySelector(\'#foo\').innerText)}"'
  var scope = spawn(t, cmd, {cwd: __dirname + '/../'})
  scope.stdout.match('"foo"\n')
  scope.end()
})

test('--eval option', function (t) {
  var cmd = 'electron cli.js http://localhost:54321/a.html --eval="document.querySelector(\'#foo\').innerText"'
  var scope = spawn(t, cmd, {cwd: __dirname + '/../'})
  scope.stdout.match('"foo"\n')
  scope.end()
})

test('stop server', function (t) {
  server.kill()
  t.ok(true, 'sent kill signal')
  t.end()
})

// electron-microscope http://localhost:8080 --eval="document.querySelector('.jumbotron-description').innerText" 2>/dev/null
// electron-microscope http://localhost:8080 script.js 2>/dev/nul