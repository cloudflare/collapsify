#!/usr/bin/env node
import http from 'node:http';
import process from 'node:process';
import systemdSocket from 'systemd-socket';
import bole from 'bole';
import summary from 'server-summary';
import httpNdjson from 'http-ndjson';
import cliclopts from 'cliclopts';
import minimist from 'minimist';
import VERSION from '../lib/version.js';
import collapsify from '../lib/node.js';

const allowedArgs = [
  {
    name: 'forbidden',
    abbr: 'x',
    default:
      '^(?:https?:)?(?:/+)?(localhost|(?:127|192.168|172.16|10).[0-9.]+)',
    help: 'Forbidden URLs (passed to the RegExp constructor).',
  },
  {
    name: 'headers',
    abbr: 'H',
    default: [],
    help: 'Custom headers (curl style) to set on all requests.',
  },
  {
    name: 'port',
    abbr: 'p',
    default: 8020,
    help: 'Port that Collapsify should listen on. Ignored when running as a systemd service.',
  },
  {
    name: 'verbose',
    abbr: 'V',
    default: 0,
    help: 'Verbosity of logging output. 0 is errors and warnings, 1 is info, 2 is all.',
  },
  {
    name: 'version',
    abbr: 'v',
    boolean: true,
    help: 'Print the version number.',
  },
  {
    name: 'help',
    abbr: 'h',
    boolean: true,
    help: 'Show this usage information.',
  },
];

const clopts = cliclopts(allowedArgs);
const argv = minimist(process.argv.slice(2), {
  alias: clopts.alias(),
  boolean: clopts.boolean(),
  default: clopts.default(),
});

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

const options = {
  forbidden: argv.forbidden,

  // eslint-disable-next-line unicorn/no-array-reduce
  headers: [argv.headers].flat().reduce((headers, header) => {
    header = header.trim().split(':');
    headers[header[0].trim()] = header[1].trim();

    return headers;
  }, {}),
};

const levels = 'warn info debug'.split(' ');
bole.output({
  level: levels[argv.verbose] || 'warn',
  stream: process.stderr,
});
const logger = bole('collapsify-server');

const socket = systemdSocket();

const server = http.createServer((request, response) => {
  httpNdjson(request, response, logger.info);
  const queries = new URL(request.url, 'http://localhost').searchParams;
  const url = queries && queries.get('url');
  if (url) {
    collapsify(url, options).then(
      (result) => {
        response.statusCode = 200;
        response.setHeader('content-type', 'text/html; charset=utf-8');
        response.end(result);
        logger.info(
          {
            url,
          },
          'Collapsify succeeded.',
        );
      },
      (error) => {
        response.statusCode = 500;
        response.end('Failed to collapsify. ' + error.message);
        logger.error(
          error,
          {
            url,
          },
          'Collapsify failed.',
        );
      },
    );
  } else {
    response.statusCode = 500;
    response.end();
  }
});

server.listen(socket || argv.port, summary(server, logger.info));
