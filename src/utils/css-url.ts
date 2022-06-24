import {validateSync} from './data-uri.js';

export default function cssUrl(node, skipCheck) {
  if (node.type === 'function' && node.value === 'url') {
    node = node.nodes[0];
    skipCheck = true;
  }

  if (node.type !== 'word' && node.type !== 'string') {
    return;
  }

  const url = node.value;
  if (!skipCheck && !/^https?:/.test(url)) {
    return;
  }

  if (validateSync(url)) {
    return;
  }

  return url;
}
