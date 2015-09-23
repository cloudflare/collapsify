'use strict';
function Logger() {
  this.logs = [];
}

[
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal'
].map(function(type) {
  Logger.prototype[type] = function() {
    var ar = [type];
    ar.push.apply(ar, arguments);
    this.logs.push(ar);
  };
});

module.exports = Logger;
