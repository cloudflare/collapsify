import type {Buffer} from 'node:buffer';

import {external as htmlCollapser} from './collapsers/html.js';
import {fetchWrapper} from './utils/fetch-wrapper.js';

export class CollapsifyError extends Error {}

export interface Response {
  getStatusCode(): number;

  getContentType(): string;

  getAsString(): Promise<string>;

  getAsArray(): Promise<Buffer>;
}

export type Fetch = (url: string) => Promise<Response>;

export interface CollapsifyOptions {
  resourceLocation: string;
  fetch: Fetch;
}

export default async function collapsify(options: CollapsifyOptions) {
  return htmlCollapser({
    resourceLocation: options.resourceLocation,
    fetch: fetchWrapper(options.fetch),
  });
}
