var App = require('app')
var microscope = require('./index.js')
var nslds = require('./nslds.js')

App.on('ready', load)

var nslds = {
  getData: function (stream) {
    stream.write('hello')
  },
  login: function (user, stream) {
    var inputUserId = document.getElementById("signIn:inputUserId")
    inputUserId.value = user.username

    var inputPassword = document.getElementById("signIn:inputPassword")
    inputPassword.value = user.password
    // document.getElementById("signIn:signin_login").click()
    if (inputUserId.indexOf('error') > 0) return stream.destroy(new Error('Bad username/password.'))
    else stream.end()
  }
}

function load () {
  var scope = microscope({}, function ready (err) {
    scope.window.loadUrl('https://www.nslds.ed.gov/npas/index.htm')
    letsgo()
  })

  function letsgo () {
    var user = {
      username: 'hello',
      password: 'test'
    }
    var data = scope.createEvalStream(function (stream) {
      nslds.login(user, stream)
    })
    data.on('error', function (e) {
      console.error("Error")
      console.trace(e.message)
      scope.window.close()
    })
    data.on('finish', function () {
      scope.domReady(function (err) {
        if (err) return exit(err)
        var data = scope.createEvalStream(getData)
        data.on('data', function (data) {
          console.log(data)
        })
        data.on('finish', function () {
          console.log('done')
        })
      })
    })
  }

  function exit (err) {
    console.error(err)
    // scope.window.close()
  }
}
