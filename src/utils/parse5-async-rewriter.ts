import {EventEmitter} from 'node:events';
import RewritingStream from 'parse5-html-rewriting-stream';

class Rewriter extends EventEmitter {
  private readonly rewriter: RewritingStream;
  private queue: Promise<void>;

  constructor() {
    super();

    this.rewriter = new RewritingStream();
    this.queue = Promise.resolve();

    for (const eventName of ['startTag', 'endTag', 'doctype', 'text']) {
      this.rewriter.on(
        eventName,
        this.deferred(async (token: any, raw: any) => {
          for (const listener of this.rawListeners(eventName)) {
            // eslint-disable-next-line no-await-in-loop
            if (await listener(token, raw)) {
              return;
            }
          }

          this.rewriter.emitRaw(raw);
        }),
      );
    }

    this.rewriter.on('comment', () => {
      /* ignore */
    });
  }

  async process(body: string) {
    return new Promise((resolve, reject) => {
      let html = '';

      this.rewriter.on('data', (chunk: string) => {
        html += chunk;
      });

      this.rewriter.once('finish', () => {
        resolve(html);
      });

      this.rewriter.once('error', reject);

      this.rewriter.write(body, () => {
        this.queue.then(() => {
          this.rewriter.end();
        }, reject);
      });
    });
  }

  emitStartTag(startTag: any) {
    this.rewriter.emitStartTag(startTag);
  }

  emitEndTag(endTag: any) {
    this.rewriter.emitEndTag(endTag);
  }

  emitDoctype(text: any) {
    this.rewriter.emitDoctype(text);
  }

  emitText(text: any) {
    this.rewriter.emitText(text);
  }

  emitRaw(html: any) {
    this.rewriter.emitRaw(html);
  }

  private deferred(fn: (...args: any[]) => Promise<void>) {
    return (...args: any[]) => {
      this.queue = this.queue.then(async () => fn(...args));
    };
  }
}

export default Rewriter;
