#!/usr/bin/env node
'use strict';
var http = require('http');
var url = require('url');
var systemdSocket = require('systemd-socket');
var bole = require('bole');
var summary = require('server-summary');
var httpNdjson = require('http-ndjson');

var allowedArgs = [{
  name: 'forbidden',
  abbr: 'x',
  default: '^(?:https?:)?(?:/+)?(localhost|(?:127|192.168|172.16|10).[0-9.]+)',
  help: 'Forbidden URLs (passed to the RegExp constructor).'
}, {
  name: 'headers',
  abbr: 'H',
  help: 'Custom headers (curl style) to set on all requests.'
}, {
  name: 'port',
  abbr: 'p',
  default: 8020,
  help: 'Port that Collapsify should listen on. Ignored when running as a systemd service.'
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

var clopts = require('cliclopts')(allowedArgs);
var argv = require('minimist')(process.argv.slice(2), {
  alias: clopts.alias(),
  boolean: clopts.boolean(),
  default: clopts.default()
});

var VERSION = require('../lib/version');
var collapsify = require('../');

if (argv.help) {
  console.log('Usage: ' + process.argv.slice(1, 2).join(' ') + ' <options>\n');
  console.log('Options:');
  clopts.print();
  process.exit(0);
}

if (argv.version) {
  console.log('Collapsify Server - ' + VERSION);
  process.exit(0);
}

argv.headers = argv.H = [].concat(argv.headers).filter(Boolean).reduce(function (headers, header) {
  header = header.trim().split(':');
  headers[header[0].trim()] = header[1].trim();

  return headers;
}, {});

var levels = 'warn info debug'.split(' ');
bole.output({
  level: levels[argv.verbose] || 'warn',
  stream: process.stdout
});
var logger = bole('collapsify-server');

var socket = systemdSocket();

var server = http.createServer(function (req, res) {
  httpNdjson(req, res, logger.info);
  var queries = url.parse(req.url, true).query;

  if (queries && queries.url) {
    collapsify(queries.url, argv).done(function (result) {
      res.statusCode = 200;
      res.setHeader('content-type', 'text/html; charset=utf-8');
      res.end(result);
      logger.info({
        url: queries.url
      }, 'Collapsify succeeded.');
    }, function (err) {
      res.statusCode = 500;
      res.end('Failed to collapsify. ' + err.message);
      logger.info(err, {
        url: url
      }, 'Collapsify failed.');
    });
  } else {
    res.statusCode = 500;
    res.end();
  }
});

server.listen(socket || argv.port, summary(server, logger.info));
