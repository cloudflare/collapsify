#!/usr/bin/env node
'use strict';
var VERSION = require('../lib/version');
var http = require('http');
var url = require('url');
var collapsify = require('../');
var systemdSocket = require('systemd-socket');
var parseArgs = require('minimist');
var fds = require('fds');
var argv = parseArgs(process.argv.slice(2), {
  'boolean': [
    'help',
    'version'
  ],
  string: [
    'headers',
    'verbose',
    'forbidden',
    'port'
  ],
  alias: {
    h: 'help',
    H: 'headers',
    v: 'verbose',
    V: 'version',
    p: 'port',
    x: 'forbidden'
  },
  'default': {
    port: 8020,
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
  console.log('-p, --port        The port for Collapsify to listen on.                  [default: 8020]');
  console.log('                  Ignored when running under systemd');
  console.log('-v, --verbose     Verbosity of logging output. 1 is errors, 2 is all.    [default: 0]');
  console.log('-V, --version     Print the version number.');
  console.log('--forbidden       Forbidden URLs (passed to the RegExp constructor)      [default: "^(?:https?:)?(?:/+)?(localhost|(?:127|192.168|172.16|10).[0-9.]+)"]');
  /* eslint-disable no-process-exit */
  process.exit(0);
  /* eslint-enable no-process-exit */
}

if (argv.version) {
  console.log('Collapsify Server - ' + VERSION);
  /* eslint-disable no-process-exit */
  process.exit(0);
  /* eslint-enable no-process-exit */
}

argv.headers = argv.H = [].concat(argv.headers).filter(Boolean).reduce(function(headers, header) {
  header = header.trim().split(':');
  headers[header[0].trim()] = header[1].trim();

  return headers;
}, {});

var logger = argv.logger = require('../lib/utils/logger')(argv);
var socket = systemdSocket();

if (socket) {
  fds.nonblock(socket.fd);
}

http.createServer(function(req, res) {
  var queries = url.parse(req.url, true).query;

  if (queries && queries.url) {
    collapsify(queries.url, argv).done(function(result) {
      res.statusCode = 200;
      res.end(result);
      logger.info({
        url: queries.url
      }, 'Collapsify succeeded.');
    }, function(err) {
      res.statusCode = 500;
      res.end('Failed to collapsify. ' + err.message);
      logger.info({
        url: queries.url,
        err: err
      }, 'Collapsify failed.');
    });
  }
}).listen(socket || argv.port);
