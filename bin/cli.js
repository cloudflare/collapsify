#!/usr/bin/env node
'use strict';
var VERSION = require('../lib/version');
var byte = require('8bits');
var allowedArgs = [{
  name: 'forbidden',
  abbr: 'x',
  'default': '^(?:https?:)?(?:/+)?(localhost|(?:127|192.168|172.16|10).[0-9.]+)',
  help: 'Forbidden URLs (passed to the RegExp constructor).'
}, {
  name: 'headers',
  abbr: 'H',
  help: 'Custom headers (curl style) to set on all requests.'
}, {
  name: 'verbose',
  abbr: 'V',
  'default': 0,
  help: 'Verbosity of logging output. 1 is errors, 2 is all.'
}, {
  name: 'version',
  abbr: 'v',
  'boolean': true,
  help: 'Print the version number.'
}, {
  name: 'help',
  abbr: 'h',
  'boolean': true,
  help: 'Show this usage information.'
}];

var clopts = require('cliclopts')(allowedArgs);
var argv = require('minimist')(process.argv.slice(2), {
  alias: clopts.alias(),
  'boolean': clopts.boolean(),
  'default': clopts.default()
});

if (argv.help) {
  console.log('Usage: ' + process.argv.slice(1, 2).join(' ') + ' [options]\n');
  console.log('Options:');
  clopts.print();
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
