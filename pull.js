// pipe all_docs?include_docs=true into this
var ndjson = require('ndjson')
var through = require('through2')
 
var format = through.obj(function (obj, enc, next) {
  var self = this
  if (!obj.name) return next()
  var url = "http://npmjs.org/" + obj.name
  self.push(url)
  next()
})
 
process.stdin.pipe(ndjson.parse()).pipe(format).pipe(ndjson.serialize()).pipe(process.stdout)
 