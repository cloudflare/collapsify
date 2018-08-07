#!/usr/bin/env node
'use strict';
const http = require('http');
const url = require('url');
const systemdSocket = require('systemd-socket');
const bole = require('bole');
const summary = require('server-summary');
const httpNdjson = require('http-ndjson');

const allowedArgs = [
  {
    name: 'forbidden',
    abbr: 'x',
    default:
      '^(?:https?:)?(?:/+)?(localhost|(?:127|192.168|172.16|10).[0-9.]+)',
    help: 'Forbidden URLs (passed to the RegExp constructor).'
  },
  {
    name: 'headers',
    abbr: 'H',
    help: 'Custom headers (curl style) to set on all requests.'
  },
  {
    name: 'port',
    abbr: 'p',
    default: 8020,
    help:
      'Port that Collapsify should listen on. Ignored when running as a systemd service.'
  },
  {
    name: 'verbose',
    abbr: 'V',
    default: 0,
    help:
      'Verbosity of logging output. 0 is errors and warnings, 1 is info, 2 is all.'
  },
  {
    name: 'version',
    abbr: 'v',
    boolean: true,
    help: 'Print the version number.'
  },
  {
    name: 'help',
    abbr: 'h',
    boolean: true,
    help: 'Show this usage information.'
  }
];

const clopts = require('cliclopts')(allowedArgs);
const argv = require('minimist')(process.argv.slice(2), {
  alias: clopts.alias(),
  boolean: clopts.boolean(),
  default: clopts.default()
});

const VERSION = require('../lib/version');
const collapsify = require('..');

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

const opts = {
  forbidden: argv.forbidden,

  headers: [...argv.headers].filter(Boolean).reduce((headers, header) => {
    header = header.trim().split(':');
    headers[header[0].trim()] = header[1].trim();

    return headers;
  }, {})
};

const levels = 'warn info debug'.split(' ');
bole.output({
  level: levels[argv.verbose] || 'warn',
  stream: process.stdout
});
const logger = bole('collapsify-server');

const socket = systemdSocket();

const server = http.createServer((req, res) => {
  httpNdjson(req, res, logger.info);
  const queries = url.parse(req.url, true).query;

  if (queries && queries.url) {
    collapsify(queries.url, opts).done(
      result => {
        res.statusCode = 200;
        res.setHeader('content-type', 'text/html; charset=utf-8');
        res.end(result);
        logger.info(
          {
            url: queries.url
          },
          'Collapsify succeeded.'
        );
      },
      err => {
        res.statusCode = 500;
        res.end('Failed to collapsify. ' + err.message);
        logger.info(
          err,
          {
            url
          },
          'Collapsify failed.'
        );
      }
    );
  } else {
    res.statusCode = 500;
    res.end();
  }
});

server.listen(socket || argv.port, summary(server, logger.info));
