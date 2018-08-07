'use strict';
const base64Utils = require('../utils/base-64');

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
  if (base64Utils.validateSync(url)) {
    return;
  }
  return url;
};
