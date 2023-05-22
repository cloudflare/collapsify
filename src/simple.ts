import httpClient from './utils/httpclient.js';
import collapseHTML, {CollapsifyError} from './collapsify.js';

export type SimpleOptions = {
  forbidden: string;
  headers?: Record<string, string>;
};

export async function simpleCollapsify(
  resourceLocation: string,
  options: SimpleOptions,
) {
  const fetch = httpClient(options?.headers);
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
