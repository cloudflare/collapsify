#!/usr/bin/env node
'use strict';
var errors = require('errors');
if (process.env.DEBUG) {
  var Rx = require('rx');
  Rx.config.longStackSupport = true;
  errors.stacks(true);
}

var VERSION = require('../lib/version');
var http = require('http');
var wayfarer = require('wayfarer');
var wayfarerToServer = require('wayfarer-to-server');
var pathnameMatch = require('pathname-match');
var url = require('url');
var collapsify = require('../');
var systemdSocket = require('systemd-socket');
var fds = require('fds');
var jsonBody = require('body/json');
var allowedArgs = [{
  name: 'forbidden',
  abbr: 'x',
  'default': '^(?:https?:)?(?:/+)?(localhost|(?:127|192.168|172.16|10).[0-9.]+)',
  help: 'Forbidden URLs (passed to the RegExp constructor).'
}, {
  name: 'headers',
  abbr: 'H',
  help: 'Custom headers (curl style) to set on all requests.'
}, {
  name: 'port',
  abbr: 'p',
  'default': 8020,
  help: 'Port that Collapsify should listen on. Ignored when running as a systemd service.'
}, {
  name: 'verbose',
  abbr: 'V',
  'default': 0,
  help: 'Verbosity of logging output. 1 is errors, 2 is all.'
}, {
  name: 'version',
  abbr: 'v',
  'boolean': true,
  help: 'Print the version number.'
}, {
  name: 'help',
  abbr: 'h',
  'boolean': true,
  help: 'Show this usage information.'
}];

var clopts = require('cliclopts')(allowedArgs);
var argv = require('minimist')(process.argv.slice(2), {
  alias: clopts.alias(),
  'boolean': clopts.boolean(),
  'default': clopts.default()
});

if (argv.help) {
  console.log('Usage: ' + process.argv.slice(1, 2).join(' ') + ' <options>\n');
  console.log('Options:');
  clopts.print();
  /* eslint-disable no-process-exit */
  process.exit(0);
  /* eslint-enable no-process-exit */
}

if (argv.version) {
  console.log('Collapsify Server - ' + VERSION);
  /* eslint-disable no-process-exit */
  process.exit(0);
  /* eslint-enable no-process-exit */
}

argv.headers = argv.H = [].concat(argv.headers).filter(Boolean).reduce(function(headers, header) {
  header = header.trim().split(':');
  headers[header[0].trim()] = header[1].trim();

  return headers;
}, {});

var logger = argv.logger = require('../lib/utils/logger')(argv);
var socket = systemdSocket();

if (socket) {
  fds.nonblock(socket.fd);
}

function json(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

function methodNotAllowed(request, response) {
  json(response, 405, {
    errors: [
      new errors.Http405Error('Method "' + request.method + '" Not Allowed"')
    ]
  });
}

function collapseWith(request, response, collapseURL, successCallback) {
  var subscription = collapsify(collapseURL, argv).subscribe(function(result) {
    successCallback(result);

    logger.info({
      url: collapseURL,
      res: response
    }, 'Collapsify succeeded.');
  }, function(err) {
    if (err instanceof errors.HttpError) {
      json(response, 502, {
        errors: [
          new errors.Http502Error({
            cause: err
          })
        ]
      });
    } else {
      json(response, 500, {
        errors: [
          new errors.Http500Error({
            cause: err
          })
        ]
      });
    }

    logger.info({
      res: response,
      err: err
    }, 'Collapsify failed.');
  });

  request.on('close', function() {
    subscription.dispose();
    logger.debug('client discconected');
  });
}

http.createServer(function(req, res) {
  var router = wayfarerToServer(wayfarer('/404'));

  router.on('/v1/collapse', {
    any: methodNotAllowed,
    post: function(request, response) {
      jsonBody(request, function(err, body) {
        if (err) {
          json(response, 400, {
            errors: [
              new errors.Http400Error('Missing or malformed JSON body')
            ]
          });
          return;
        }

        collapseWith(request, response, body.url, function(result) {
          json(response, 200, {
            data: [{
              html: result
            }]
          });
        });
      });
    }
  });

  router.on('/', {
    any: methodNotAllowed,
    get: function(request, response) {
      var queries = url.parse(req.url, true).query;

      if (queries && !queries.url) {
        json(response, 400, {
          errors: [
            new errors.Http400Error('Missing "url" query parameter')
          ]
        });
        return;
      }

      collapseWith(request, response, queries.url, function(result) {
        response.statusCode = 200;
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        response.end(result);
      });
    }
  });

  router.on('/404', {
    any: function(request, response) {
      json(response, 404, {
        errors: [
          new errors.Http404Error('Route Not Found')
        ]
      });
    }
  });

  router(pathnameMatch(req.url), req, res);
}).listen(socket || argv.port);
