#!/usr/bin/env node
import * as fs from 'node:fs';
import * as process from 'node:process';
import bole from 'bole';
import ndjs from 'ndjson-logrus';
import Pumpify from 'pumpify';
import cliclopts, {Argument} from 'cliclopts';
import minimist from 'minimist';
import VERSION from '../version.js';
import collapsifyNode from '../node.js';

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
  {
    name: 'output',
    abbr: 'o',
    default: '/dev/null',
    help: 'Destination path for the resulting output',
  },
];

const clopts = cliclopts(allowedArgs);
const argv = minimist(process.argv.slice(2), {
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

const options = {
  forbidden: argv.forbidden,

  // eslint-disable-next-line unicorn/no-array-reduce
  headers: argv.headers.filter(Boolean).reduce((headers: any, header: any) => {
    header = header.trim().split(':');
    headers[header[0].trim()] = header[1].trim();

    return headers;
  }, {}),
};

const levels = 'warn info debug'.split(' ');
bole.output({
  level: levels[argv.verbose] || 'warn',
  stream: new Pumpify(ndjs(), process.stderr),
});
const logger = bole('collapsify-cli');

const domain = argv._[0];

collapsifyNode(domain, options).then(
  (output: any) => {
    logger.info(`Collapsed Size: ${String(output.length)} bytes`);
    fs.writeFileSync(argv.output, output);
  },
  (error) => {
    logger.error('An error has occured while collapsing', domain, error);
  },
);