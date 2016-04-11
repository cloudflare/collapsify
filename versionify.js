#!/usr/bin/env node
'use strict';
var fs = require('fs');
var BL = require('bl');
var version = require('./package.json').version;

var bl = new BL();
bl.append('\'use strict\';\n');
bl.append('module.exports = \'');
bl.append(version);
bl.append('\';\n');

bl.pipe(fs.createWriteStream('./lib/version.js'));
