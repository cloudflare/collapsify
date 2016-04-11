'use strict';
var bunyan = require('bunyan');

module.exports = function (options) {
  var levels = [
    'warn',
    'info',
    'debug'
  ];
  var logger = bunyan.createLogger({
    name: 'collapsify',
    level: levels[options.verbose] || 'warn',
    serializers: bunyan.stdSerializers
  });

  return logger;
};
