#!/usr/bin/env node
'use strict';
var VERSION = require('../lib/version');
var byte = require('8bits');
var parseArgs = require('minimist');
var argv = parseArgs(process.argv.slice(2), {
  'boolean': [
    'help',
    'version'
  ],
  string: [
    'headers',
    'verbose',
    'forbidden'
  ],
  alias: {
    h: 'help',
    H: 'headers',
    v: 'verbose',
    V: 'version',
    x: 'forbidden'
  },
  'default': {
    depth: 10,
    verbose: 0,
    forbidden: '^(?:https?:)?(?:\/+)?(localhost|(?:127|192.168|172.16|10).[0-9.]+)'
  }
});

if (argv.help) {
  console.log('Usage: ' + process.argv.slice(0, 2).join(' ') + ' <options>\n');
  console.log('Options:');
  console.log('-h, --help        Show this usage information.');
  console.log('-H, --headers     Custom headers (curl style) to set on all requests.');
  console.log('-v, --verbose     Verbosity of logging output. 1 is errors, 2 is all.    [default: 0]');
  console.log('-V, --version     Print the version number.');
  console.log('--forbidden       Forbidden URLs (passed to the RegExp constructor)      [default: "^(?:https?:)?(?:/+)?(localhost|(?:127|192.168|172.16|10).[0-9.]+)"]');
  /* eslint-disable no-process-exit */
  process.exit(0);
  /* eslint-enable no-process-exit */
}

if (argv.version) {
  console.log('Collapsify CLI - ' + VERSION);
  /* eslint-disable no-process-exit */
  process.exit(0);
  /* eslint-enable no-process-exit */
}

argv.headers = argv.H = [].concat(argv.headers).filter(Boolean).reduce(function(headers, header) {
  header = header.trim().split(':');
  headers[header[0].trim()] = header[1].trim();

  return headers;
}, {});

argv.logger = require('../lib/utils/logger')(argv);

var domain = argv._[0];

require('../')(domain, argv).done(function(output) {
  console.log('Collapsed Size: ', byte(output.length, {
    binary: true,
    digits: 2
  }));
}, function(err) {
  console.log('An error has occured: ', err.name, ': ', err.message);
});
