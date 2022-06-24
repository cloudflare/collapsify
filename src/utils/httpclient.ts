import * as process from 'node:process';
import type {Buffer} from 'node:buffer';
import got from 'got';
import type {Headers} from 'got';
import PQueue from 'p-queue';
import bole from 'bole';
import VERSION from '../version.js';
import type {Fetch, Response} from '../collapsify';

const logger = bole('collapsify:http');

class GotResponse implements Response {
  constructor(
    private readonly contentType: string,
    private readonly buffer: Buffer,
  ) {}

  getContentType(): string {
    return this.contentType;
  }

  async getAsString(): Promise<string> {
    return String(this.buffer);
  }

  async getAsArray(): Promise<Buffer> {
    return this.buffer;
  }
}

export default function makeClient(defaultHeaders: Headers): Fetch {
  const cache = new Map();

  const client = got.extend({
    headers: {
      'user-agent': `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10; rv:60.0) Gecko/20100101 Firefox/60.0 Collapsify/${String(
        VERSION,
      )} node/${String(process.version)}`,
      ...defaultHeaders,
    },
    responseType: 'buffer',
    timeout: {request: 2000},
    retry: {limit: 5},
  });

  const queue = new PQueue({
    concurrency: 8,
  });

  async function gotFetch(url: string) {
    const response = await queue.add(() => {
      logger.debug('Fetching %s.', url);
      return client.get(url, {cache});
    });

    if (response.fromCache) {
      logger.debug('Retrieved %s from cache.', url);
    }

    return new GotResponse(response.headers['content-type'], response.body);
  }

  return gotFetch;
}
