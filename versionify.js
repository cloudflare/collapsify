#!/usr/bin/env node
'use strict';
const fs = require('fs');
const BL = require('bl');
const {version} = require('./package.json');

const bl = new BL();
bl.append("'use strict';\n");
bl.append("module.exports = '");
bl.append(version);
bl.append("';\n");

bl.pipe(fs.createWriteStream('./lib/version.js'));
