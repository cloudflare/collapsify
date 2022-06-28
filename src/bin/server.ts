#!/usr/bin/env node
/* eslint @typescript-eslint/no-unsafe-assignment: 0 */
/* eslint @typescript-eslint/no-unsafe-call: 0 */
import * as http from 'node:http';
import * as process from 'node:process';
import systemdSocket from 'systemd-socket';
import bole from 'bole';
import type {Headers} from 'got';
import summary from 'server-summary';
import httpNdjson from 'http-ndjson';
import cliclopts, {Argument} from 'cliclopts';
import minimist from 'minimist';
import VERSION from '../version.js';
import collapsify from '../node.js';

const allowedArgs: Argument[] = [
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

interface Args {
  help: boolean;
  version: boolean;
  forbidden: string;
  headers: string[];
  verbose: number;
}

const clopts = cliclopts(allowedArgs);
const argv = minimist<Args>(process.argv.slice(2), {
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
  console.log('Collapsify Server - ' + String(VERSION));
  process.exit(0);
}

const headers: Headers = {};
for (const header of argv.headers.filter(Boolean)) {
  const [key, value] = header.trim().split(':');
  headers[key.trim()] = value.trim();
}

const options = {
  forbidden: argv.forbidden,

  headers,
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
  const queries =
    request.url && new URL(request.url, 'http://localhost').searchParams;
  const url = queries?.get('url');
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
        response.end('Failed to collapsify. ' + String(error.message));
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
