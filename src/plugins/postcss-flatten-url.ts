import {Plugin} from 'postcss';
import valueParser from 'postcss-value-parser';
import collapseBinary from '../collapsers/binary.js';
import {CollapsifyOptions} from '../collapsify.js';
import cssURL from '../utils/css-url.js';

export default function flattenUrl(options: CollapsifyOptions): Plugin {
  return {
    postcssPlugin: 'postcss-flatten-url',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    async Once(css) {
      const tasks: Array<Promise<void>> = [];

      css.walkDecls((decl) => {
        const parsedValue = valueParser(decl.value);
        const newTasks: Array<Promise<void>> = [];

        parsedValue.walk((node, index, nodes) => {
          const url = cssURL(node, false);

          if (!url) return;

          newTasks.push(
            collapseBinary
              .external({
                fetch: options.fetch,
                resourceLocation: new URL(
                  url,
                  options.resourceLocation,
                ).toString(),
              })
              .then((binaryString) => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                nodes[index] = {
                  type: 'function',
                  value: 'url',
                  nodes: [
                    {
                      type: 'word',
                      value: binaryString,
                    } as any,
                  ],
                } as any;
              }),
          );
        });

        const promise = Promise.all(newTasks).then(() => {
          // eslint-disable-next-line @typescript-eslint/no-base-to-string
          decl.value = parsedValue.toString();
        });

        tasks.push(promise);
      });

      await Promise.all(tasks);
    },
  };
}
