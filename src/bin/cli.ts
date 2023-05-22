#!/usr/bin/env node
/* eslint @typescript-eslint/no-unsafe-assignment: 0 */
/* eslint @typescript-eslint/no-unsafe-call: 0 */
import * as fs from 'node:fs';
import * as process from 'node:process';
import bole from 'bole';
import cliclopts, {type Argument} from 'cliclopts';
import minimist from 'minimist';
import VERSION from '../version.js';
import {simpleCollapsify} from '../simple.js';

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
    name: 'verbose',
    abbr: 'V',
    default: 1,
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
  {
    name: 'output',
    abbr: 'o',
    default: '/dev/null',
    help: 'Destination path for the resulting output',
  },
];

type Args = {
  help: boolean;
  version: boolean;
  forbidden: string;
  headers: string[];
  verbose: number;
  output: string;
};

const clopts = cliclopts(allowedArgs);
const argv = minimist<Args>(process.argv.slice(2), {
  alias: clopts.alias(),
  boolean: clopts.boolean(),
  default: clopts.default(),
});

if (argv.help) {
  console.log('Usage: ' + process.argv.slice(1, 2).join(' ') + ' [options]\n');
  console.log('Options:');
  clopts.print();
  process.exit(0);
}

if (argv.version) {
  console.log('Collapsify CLI - ' + String(VERSION));
  process.exit(0);
}

const headers: Record<string, string> = {};
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
const logger = bole('collapsify-cli');

const url = argv._[0];

const output = await simpleCollapsify(url, options);
logger.info(`Collapsed Size: ${String(output.length)} bytes`);
fs.writeFileSync(argv.output, output);
