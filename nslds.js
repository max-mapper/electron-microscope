var fs = require('fs')
var App = require('app')
var microscope = require('./index.js')
var cookiesScript = fs.readFileSync('./cookiesScript.js').toString()

App.on('ready', load)

App.commandLine.appendSwitch('ignore-certificate-errors', true)

function load () {
  var scope = microscope({insecure: false, https: true}, function ready (err) {
    scope.window.loadUrl('https://www.nslds.ed.gov/npas/index.htm')
    scope.window.webContents.executeJavaScript(cookiesScript)
    letsgo()
  })

  function nsldsLogin (stream) {
    var user = {
      username: 'myusername',
      password: 'mypassword'
    }
    return function (user) {
      var inputUserId = document.getElementById("signIn:inputUserId")
      inputUserId.value = user.username
      var inputPassword = document.getElementById("signIn:inputPassword")
      inputPassword.value = user.password
      // document.getElementById("signIn:signin_login").click()
      if (inputUserId.className.indexOf('error') > 0) return stream.destroy(new Error('Bad username/password.'))
      else stream.end()
    }(user)
  }


  function letsgo () {
    var data = scope.createEvalStream(nsldsLogin)
    data.on('data', function (d) {
      console.log(d)
    })
    data.on('error', function (e) {
      console.error("Error")
      console.trace(e.message)
      scope.window.close()
    })
    data.on('finish', function () {
      scope.domReady(function (err) {
        // if (err) return exit(err)
        // var data = scope.createEvalStream(getData)
        // data.on('data', function (data) {
        //   console.log(data)
        // })
        // data.on('finish', function () {
        //   console.log('done')
        // })
      })
    })
  }

  function exit (err) {
    console.error(err)
    // scope.window.close()
  }
}
