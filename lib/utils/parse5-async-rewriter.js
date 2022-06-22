import {EventEmitter} from 'node:events';
import RewritingStream from 'parse5-html-rewriting-stream';

class Rewriter extends EventEmitter {
  constructor() {
    super();

    this._rewriter = new RewritingStream();
    this._queue = Promise.resolve();

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
        }),
      );
    }

    this._rewriter.on('comment', () => {
      /* ignore */
    });
  }

  _deferred(fn) {
    return (...args) => {
      this._queue = this._queue.then(() => fn(...args));
    };
  }

  process(body) {
    return new Promise((resolve, reject) => {
      let html = '';

      this._rewriter.on('data', (chunk) => {
        html += chunk;
      });

      this._rewriter.once('finish', () => {
        resolve(html);
      });

      this._rewriter.once('error', reject);

      this._rewriter.write(body, () => {
        this._queue.then(() => {
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
  'emitText',
  'emitRaw',
]) {
  Rewriter.prototype[methodName] = function (...args) {
    this._rewriter[methodName](...args);
  };
}

export default Rewriter;
