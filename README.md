# Collapsify [![](http://img.shields.io/npm/dm/collapsify.svg?style=flat)](https://www.npmjs.org/package/collapsify) [![](http://img.shields.io/npm/v/collapsify.svg?style=flat)](https://www.npmjs.org/package/collapsify)

> Inlines all of the JavaScripts, stylesheets, images, fonts etc. of an HTML page.

## Installation

```sh
npm install -g collapsify
```

## Usage

You can use the collapsify CLI like this to download and save the page into a single file like this:
```sh
collapsify -o single-page.html https://my-site.com/
```
see `collapsify -h` for all options.

## API

```javascript
import {simpleCollapsify} from 'collapsify';

await simpleCollapsify('https://example.com', {
  headers: {
    'accept-language': 'en-US'
  }
})
  .then(page => console.log(page))
  .catch(err => console.error(err));

```

The `simpleCollapsify` function takes the URL to collapse, as well as an object of options, and returns a promise that resolves to a String.

### Options

* **headers**: An object of headers, to be added to each HTTP request.
* **forbidden**: A regex that matches blacklisted resources that should be avoided while navigating.

## Requirements
The simple mode and CLI require nodejs >= 18, as they use the global `fetch` function.