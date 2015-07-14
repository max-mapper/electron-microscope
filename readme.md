# electron-microscope

use [electron](http://electron.atom.io/) to inspect websites and extract data, from JS or the CLI. useful for automation, testing, web scraping, etc

**BETA DISCLAIMER** early adopters only, this module is still *hecka fresh*

```
npm link
npm run bundle
npm i electron-prebuilt -g
electron-microscope http://hoytarboretum.gardenexplorer.org/taxalist.aspx --eval="document.querySelector('h1 a').innerText" 2>/dev/null
```

## usage

## `var microscope = require('electron-microscope')`

returns a constructor

## `var scope = microscope(options, ready)`

creates a new instance with `options`, and calls `ready` when done with `(err)` if there was an error

### properties

- `scope.window` - the `browser-window` instance

## `scope.loadUrl(url, cb)`

loads `url` in the browser window, waits for the `dom-ready` event and then calls `cb` with `(err, resp)`. `resp` will be the http response information object (status code etc)

## `scope.createEvalStream(script)`

runs `script` on the currently loaded pages. returns a readable stream of data that is sent back from the users script

the `script` should be a string (or a function that can be `.toString()`'d safely) that looks like this:

```
function (writable) {
  writable.write('hi from client')
  writable.end()
}
```

the `writable` stream above, which runs on the page, is connected to the return value of `createEvalStream`. This is how you 'capture' data from the page and do stuff with it

## `scope.domReady(cb)`

waits for the next `dom-ready` event to be fired, and calls `cb` with `(err, resp)` (the same as `loadUrl` above).

the use case for this method is in case your client script e.g. clicks a link in a page, triggering a new page load, and you want to wait for the new page to load
