function scraper (stream) {
  stream.write(document.querySelector('.content-title').innerText)
  stream.end()
}