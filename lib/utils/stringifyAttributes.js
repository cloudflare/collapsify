'use strict';

module.exports = function stringifyAttributes(attrs, excluded) {
  excluded = excluded || [];

  return Object.keys(attrs).reduce(function(acc, name) {
    if (excluded.indexOf(name) >= 0) {
      return acc;
    }
    var value = attrs[name];

    acc += ' ' + name;

    // Attributes without a value are assumed to be booleans.
    if (value.length || value.toLowerCase() !== name) {
      acc += '="' + value
        + '"';
    }

    return acc;
  }, '');
};
