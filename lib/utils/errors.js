'use strict';

var errors = require('errors');

// Forbidden URL extends HttpError as it triggers the client-error response code.
// Hacky :(
errors.create({
  name: 'ForbiddenURLError',
  code: 1000,
  defaultMessage: 'The requested URL is forbidden',
  parent: errors.HttpError
});

errors.create({
  name: 'HTTPRedirectionError',
  code: 1001,
  defaultMessage: 'The redirection limit has been reached',
  parent: errors.HttpError
});

errors.create({
  name: 'UnknownWorkerError',
  code: 2000,
  defaultMessage: 'Unknown worker type'
});

errors.create({
  name: 'HTMLParserError',
  code: 2001,
  defaultMessage: 'The HTML parser encountered an error'
});

errors.create({
  name: 'CSSParserError',
  code: 2002,
  defaultMessage: 'The CSS parser encountered an error'
});

module.exports = errors;
