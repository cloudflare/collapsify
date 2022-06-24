import type {Buffer} from 'node:buffer';

export {external as default} from './collapsers/html.js';

export interface Response {
  getContentType(): string;

  getAsString(): Promise<string>;

  getAsArray(): Promise<Buffer>;
}

export type Fetch = (url: string) => Promise<Response>;
