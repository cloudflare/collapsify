'use strict';
const {EventEmitter} = require('events');
const RewritingStream = require('parse5-html-rewriting-stream');

class CollapserStream extends EventEmitter {
  constructor() {
    super();

    this._rewriter = new RewritingStream();
    this._promise = Promise.resolve();

    for (const eventName of ['startTag', 'endTag', 'doctype', 'text']) {
      this._rewriter.on(
        eventName,
        this._deferred(async (token, raw) => {
          for (const listener of this.rawListeners(eventName)) {
            // eslint-disable-next-line no-await-in-loop
            if (await listener(token, raw)) {
              return;
            }
          }
          this._rewriter.emitRaw(raw);
        })
      );
    }

    this._rewriter.on('comment', () => {
      /* ignore */
    });
  }

  _deferred(fn) {
    return (...args) => {
      this._promise = this._promise.then(() => fn(...args));
    };
  }

  process(body) {
    return new Promise((resolve, reject) => {
      let html = '';

      this._rewriter.on('data', chunk => {
        html += chunk;
      });

      this._rewriter.once('finish', () => {
        resolve(html);
      });

      this._rewriter.once('error', reject);

      this._rewriter.write(body, () => {
        this._promise.then(() => {
          this._rewriter.end();
        }, reject);
      });
    });
  }
}

for (const methodName of [
  'emitStartTag',
  'emitEndTag',
  'emitDoctype',
  'emitText'
]) {
  CollapserStream.prototype[methodName] = function(...args) {
    this._rewriter[methodName](...args);
  };
}

async function external(opts) {
  const {body} = await opts.fetch(opts.resourceLocation);
  return collapse(body, opts);
}

function collapse(body, opts) {
  const rewriter = new CollapserStream();

  require('../plugins/parse5-flatten-image')(rewriter, opts);
  require('../plugins/parse5-flatten-inline-style')(rewriter, opts);
  require('../plugins/parse5-flatten-external-style')(rewriter, opts);
  require('../plugins/parse5-flatten-script')(rewriter, opts);

  return rewriter.process(String(body));
}

collapse.external = external;
collapse.CollapserStream = CollapserStream;

module.exports = collapse;
