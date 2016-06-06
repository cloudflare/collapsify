'use strict';
var assert = require('power-assert');
var Bluebird = require('bluebird');
var posthtml = require('posthtml');
var describe = require('mocha').describe;
var it = require('mocha').it;

var plugin = require('../../lib/plugins/posthtml-flatten-script');

function test(input, output, opts) {
  return posthtml([plugin(opts)]).process(input).then(function (result) {
    assert(result.html === output);
  });
}

describe('posthtml-flatten-script', function () {
  it('should flatten inline JavaScript', function () {
    return test('<script>alert("foo" + "bar");</script>', '<script>alert("foobar");</script>', {
      fetch: function () {
        assert(false, 'unexpected resource resolution');
      }
    });
  });

  it('should ignore scripts with types other than JavaScript', function () {
    var handlebars = '<script type="text/x-handlebars-template"><div><h1>{{title}}</h1></div></script>';
    return test(handlebars, handlebars, {
      fetch: function () {
        assert(false, 'unexpected resource resolution');
      }
    });
  });

  it('should flatten inline JavaScript wraped in CDATA', function () {
    return test('<script type="application/javascript">\n//<![CDATA[\nalert("foo" + "bar");\n//]]>', '<script type="application/javascript">alert("foobar");</script>', {
      fetch: function () {
        assert(false, 'unexpected resource resolution');
      }
    });
  });

  it('should flatten external JavaScript', function () {
    return test('<script src="app.js"></script>', '<script>alert("foobar");</script>', {
      fetch: function (url) {
        assert(url === 'https://example.com/app.js');
        return Bluebird.resolve(new Buffer('alert("foo" + "bar");'));
      },
      resourceLocation: 'https://example.com/'
    });
  });
});
