var path = require('path')

module.exports = scrape

function scrape (BrowserWindow, pageUrl, cb) {
  var win
  win = new BrowserWindow({
    "web-preferences": {
      "web-security": true
    },
    nodeIntegration: false,
    show: true
  })
  var limit = 10000
  var loadedPage = false
  var loadedAll = false
  var finished = false
  
  var limitInterval = setTimeout(function () {
    if (finished) return
    finished = true
    win.close()
    cb(new Error('Timed out'))
  }, limit)
  
  win.loadUrl(pageUrl)
  
  var responseDetails
  win.webContents.once('did-get-response-details', function (event, status, newUrl, originalUrl, respCode, method, referrer, headers) {
    responseDetails = {
      status: status,
      url: newUrl,
      originalUrl: originalUrl,
      statusCode: respCode,
      method: method,
      referrer: referrer,
      headers: headers
    }
  })
  
  win.webContents.once('dom-ready', function (ev) {
    clearInterval(limitInterval)
    
    cb(null, win, responseDetails, cleanup)
    
    function cleanup () {
      if (finished) return
      finished = true
      win.close()
    }
  })
  
  win.webContents.once('did-fail-load', function (ev, code, desc) {
    if (finished) return
    finished = true
    win.close()
    cb(new Error(desc))
  })
}
