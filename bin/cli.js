#!/usr/bin/env node
'use strict';
const byte = require('8bits');
const bole = require('bole');
const ndjs = require('ndjson-logrus');
const pumpify = require('pumpify');

const allowedArgs = [{
  name: 'forbidden',
  abbr: 'x',
  default: '^(?:https?:)?(?:/+)?(localhost|(?:127|192.168|172.16|10).[0-9.]+)',
  help: 'Forbidden URLs (passed to the RegExp constructor).'
}, {
  name: 'headers',
  abbr: 'H',
  help: 'Custom headers (curl style) to set on all requests.'
}, {
  name: 'verbose',
  abbr: 'V',
  default: 0,
  help: 'Verbosity of logging output. 0 is errors and warnings, 1 is info, 2 is all.'
}, {
  name: 'version',
  abbr: 'v',
  boolean: true,
  help: 'Print the version number.'
}, {
  name: 'help',
  abbr: 'h',
  boolean: true,
  help: 'Show this usage information.'
}];

const clopts = require('cliclopts')(allowedArgs);
const argv = require('minimist')(process.argv.slice(2), {
  alias: clopts.alias(),
  boolean: clopts.boolean(),
  default: clopts.default()
});

const VERSION = require('../lib/version');

if (argv.help) {
  console.log('Usage: ' + process.argv.slice(1, 2).join(' ') + ' [options]\n');
  console.log('Options:');
  clopts.print();
  process.exit(0);
}

if (argv.version) {
  console.log('Collapsify CLI - ' + VERSION);
  process.exit(0);
}

argv.headers = argv.H = [].concat(argv.headers).filter(Boolean).reduce((headers, header) => {
  header = header.trim().split(':');
  headers[header[0].trim()] = header[1].trim();

  return headers;
}, {});

const levels = 'warn info debug'.split(' ');
bole.output({
  level: levels[argv.verbose] || 'warn',
  stream: pumpify(ndjs(), process.stdout)
});
const logger = bole('collapsify-cli');

const domain = argv._[0];

require('..')(domain, argv).done(output => {
  console.log('Collapsed Size: ', byte(output.length, {
    binary: true,
    digits: 2
  }));
}, err => {
  logger.error(err, 'An error has occured while collapsing %s', domain);
});
