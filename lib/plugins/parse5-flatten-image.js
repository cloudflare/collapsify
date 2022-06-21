'use strict';
const collapseBinary = require('../collapsers/binary');
const dataURI = require('../utils/data-uri');

module.exports = (rewriter, options) =>
  rewriter.on('startTag', async (tag) => {
    if (tag.tagName !== 'img') {
      return;
    }

    const src = tag.attrs.find((attr) => attr.name === 'src');

    if (!src) {
      return;
    }

    const url = src.value;

    if (dataURI.validateSync(url)) {
      return;
    }

    src.value = await collapseBinary.external({
      fetch: options.fetch,
      resourceLocation: new URL(url, options.resourceLocation).toString(),
    });

    rewriter.emitStartTag(tag);

    return true;
  });
