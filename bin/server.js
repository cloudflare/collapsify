#!/usr/bin/env node
'use strict';
if (process.env.DEBUG) {
  var Rx = require('rx');
  Rx.config.longStackSupport = true;
}

var VERSION = require('../lib/version');
var http = require('http');
var httperr = require('httperr');
var url = require('url');
var collapsify = require('../');
var systemdSocket = require('systemd-socket');
var fds = require('fds');
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
  name: 'port',
  abbr: 'p',
  'default': 8020,
  help: 'Port that Collapsify should listen on. Ignored when running as a systemd service.'
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
  console.log('Usage: ' + process.argv.slice(1, 2).join(' ') + ' <options>\n');
  console.log('Options:');
  clopts.print();
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
    collapsify(queries.url, argv).subscribe(function(result) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(result);

      logger.info({
        url: queries.url
      }, 'Collapsify succeeded.');
    }, function(err) {
      if (err instanceof httperr.HttpError) {
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({
          errors: [{
            code: err.statusCode,
            message: err.title + ': ' + err.message
          }]
        }));
      } else {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({
          errors: [
            {
              code: err.code || 999,
              message: process.env.NODE_ENV === 'development' ? err.message : 'An unknown error occured.'
            }
          ]
        }));
      }

      logger.info({
        url: queries.url,
        err: err
      }, 'Collapsify failed.');
    });
  }
}).listen(socket || argv.port);
