'use strict';
const dataURI = require('../utils/data-uri');

module.exports = (node, skipCheck) => {
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
  if (dataURI.validateSync(url)) {
    return;
  }
  return url;
};
