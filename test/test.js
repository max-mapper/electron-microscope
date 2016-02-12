var test = require('tape')
var concat = require('concat-stream')
var microscope = require('../')
var electron = require('electron')

electron.app.on('ready', function () {
  test('basic', function (t) {
    var scope = microscope(function (err) {
      if (err) t.ifError(err)
      scope.loadURL('https://www.google.com', function (err) {
        if (err) t.ifError(err)
        var output = scope.run(function (send, done) {
          for (var i = 0; i < 5; i++) send('woo-' + i)
          done()
        })
        output.pipe(concat(function (out) {
          t.equal(out.toString(), 'woo-0woo-1woo-2woo-3woo-4', 'output matched')
          scope.destroy()
          t.end()
        }))
      })
    })
  })
})
