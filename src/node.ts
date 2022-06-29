import type {Headers} from 'got';
import httpClient from './utils/httpclient.js';
import collapseHTML, {CollapsifyError} from './collapsify.js';

interface NodeOptions {
  forbidden?: string;
  headers?: Headers;
}

export default async function collapsifyNode(
  resourceLocation: string,
  options: NodeOptions,
) {
  const fetch = httpClient(options.headers);

  options = Object.assign(
    {
      forbidden: 'a^',
    },
    options,
  );

  async function read(url: string) {
    const re = new RegExp(options.forbidden, 'i');

    if (re.test(url)) {
      throw new CollapsifyError('Forbidden resource ' + url);
    }

    return fetch(url);
  }

  return collapseHTML({
    fetch: read,
    resourceLocation,
  });
}
