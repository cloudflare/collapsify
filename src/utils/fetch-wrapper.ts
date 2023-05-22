import type {Buffer} from 'node:buffer';
import bole from 'bole';
import {CollapsifyError, type Fetch, type Response} from '../collapsify.js';

const logger = bole('collapsify:fetch');

export function fetchWrapper(fetch: Fetch): Fetch {
  return async (url) => {
    try {
      const response = await fetch(url);
      if (response.getStatusCode() >= 300) {
        throw new CollapsifyError(
          `Fetch failed, ${url} returned ${response.getStatusCode()}`,
        );
      }

      return new ResponseWrapper(url, response);
    } catch (error: unknown) {
      if (error instanceof CollapsifyError) {
        throw error;
      }

      logger.error(error);
      throw new CollapsifyError(`Fetch failed, ${url} unknown error occured`);
    }
  };
}

class ResponseWrapper implements Response {
  constructor(
    private readonly url: string,
    private readonly response: Response,
  ) {}

  getStatusCode(): number {
    return this.response.getStatusCode();
  }

  getContentType(): string {
    return this.response.getContentType();
  }

  async getAsString(): Promise<string> {
    try {
      return await this.response.getAsString();
    } catch (error: unknown) {
      logger.error(error);
      throw new CollapsifyError(`Couldn't read ${this.url} as string`);
    }
  }

  async getAsArray(): Promise<Buffer> {
    try {
      return await this.response.getAsArray();
    } catch (error: unknown) {
      logger.error(error);
      throw new CollapsifyError(`Couldn't read ${this.url} as binary`);
    }
  }
}
