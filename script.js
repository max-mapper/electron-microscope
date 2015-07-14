function scraper (stream) {
  stream.write(document.querySelector('.jumbotron-title').innerText)
  stream.end()
}