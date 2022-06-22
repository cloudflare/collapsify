import process from 'node:process';
import got from 'got';
import PQueue from 'p-queue';
import bole from 'bole';
import VERSION from '../version.js';

const logger = bole('collapsify:http');

class Response {
  constructor(contentType, buffer) {
    this.contentType = contentType;
    this.buffer = buffer;
  }

  getContentType() {
    return this.contentType;
  }

  async getAsString() {
    return String(this.buffer);
  }

  async getAsArray() {
    return this.buffer;
  }
}

export default function makeClient(defaultHeaders) {
  const cache = new Map();

  const client = got.extend({
    headers: {
      'user-agent': `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10; rv:60.0) Gecko/20100101 Firefox/60.0 Collapsify/${VERSION} node/${process.version}`,
      ...defaultHeaders,
    },
    responseType: 'buffer',
    timeout: 2000,
    retries: 5,
  });

  const queue = new PQueue({
    concurrency: 8,
  });

  async function fetch(url) {
    const response = await queue.add(() => {
      logger.debug('Fetching %s.', url);
      return client.get(url, {cache});
    });

    if (response.fromCache) {
      logger.debug('Retrieved %s from cache.', url);
    }

    return new Response(response.headers['content-type'], response.body);
  }

  return fetch;
}
