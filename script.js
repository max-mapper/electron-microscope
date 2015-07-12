function scraper (stream) {
  stream.write(document.querySelector('#ctl00_lblTitle').innerText)
  stream.end()
}