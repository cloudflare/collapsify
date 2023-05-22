import {type Plugin, Result} from 'postcss';
import valueParser from 'postcss-value-parser';
import collapseCSS from '../collapsers/css.js';
import {type CollapsifyOptions} from '../collapsify.js';
import cssURL from '../utils/css-url.js';

export default function flattenImport(options: CollapsifyOptions): Plugin {
  return {
    postcssPlugin: 'postcss-flatten-import',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    async Once(css) {
      const tasks: Array<Promise<void>> = [];

      css.walkAtRules('import', (rule) => {
        const parsedValue = valueParser(rule.params);
        const url = cssURL(parsedValue.nodes[0], true);

        if (!url) return;

        const promise = collapseCSS
          .external({
            imported: true,
            fetch: options.fetch,
            resourceLocation: new URL(url, options.resourceLocation).toString(),
          })
          .then((result) => {
            if (!(result instanceof Result)) {
              throw new TypeError(`postcss result wasn't a Result`);
            }

            if (parsedValue.nodes.length > 1) {
              rule.name = 'media';
              rule.params = rule.params
                .slice(parsedValue.nodes[1].sourceIndex)
                .trim();
              rule.raws.between = ' ';
              rule.append(result.root);
            } else {
              rule.replaceWith(result.root);
            }
          });

        tasks.push(promise);
      });

      await Promise.all(tasks);
    },
  };
}
