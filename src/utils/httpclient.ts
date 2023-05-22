import {Buffer} from 'node:buffer';
import bole from 'bole';
import VERSION from '../version.js';
import type {Fetch, Response} from '../collapsify';

const logger = bole('collapsify:http');

const userAgent = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10; rv:60.0) Gecko/20100101 Firefox/60.0 Collapsify/${VERSION}`;

class FetchResponse implements Response {
  constructor(
    private readonly statusCode: number,
    private readonly contentType: string,
    private readonly blob: Blob,
  ) {}

  getStatusCode(): number {
    return this.statusCode;
  }

  getContentType(): string {
    return this.contentType;
  }

  async getAsString(): Promise<string> {
    return this.blob.text();
  }

  async getAsArray(): Promise<Buffer> {
    return Buffer.from(await this.blob.arrayBuffer());
  }
}

export default function makeClient(
  defaultHeaders?: Record<string, string>,
): Fetch {
  const cache = new Map();

  async function nodeFetch(url: string) {
    logger.debug('Fetching %s.', url);

    const resp = await fetch(url, {
      headers: {
        'user-agent': userAgent,
        ...defaultHeaders,
      },
    });

    return new FetchResponse(
      resp.status,
      resp.headers.get('content-type') ?? '',
      await resp.blob(),
    );
  }

  return nodeFetch;
}
