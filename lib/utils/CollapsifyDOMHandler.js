'use strict';
var Rx = require('rx');
var domelementtype = require('domelementtype');

function CollapsifyHandler() {
  this._tagStack = [];
  this._currentText = null;
  this.process = new Rx.Subject();
}

CollapsifyHandler.prototype.onopentag = function(name, attrs) {
  this._emitText();

  var type;
  var lastElement = this._tagStack[this._tagStack.length - 1];

  if (name === 'script') {
    type = domelementtype.Script;
  } else if (name === 'style') {
    type = domelementtype.Style;
  } else {
    type = domelementtype.Tag;
  }

  var elem = {
    type: type,
    name: name,
    attrs: attrs || {},
    parent: lastElement
  };

  this._tagStack.push(elem);

  this.process.onNext({
    type: 'opentag',
    elem: elem
  });
};
CollapsifyHandler.prototype.onclosetag = function() {
  this._emitText();

  var elem = this._tagStack.pop();

  this.process.onNext({
    type: 'closetag',
    elem: elem
  });
};
CollapsifyHandler.prototype.ontext = function(text) {
  if (this._currentText) {
    this._currentText.data += text;
    return;
  }

  var lastElement = this._tagStack[this._tagStack.length - 1];

  this._currentText = {
    type: domelementtype.Text,
    data: text,
    parent: lastElement
  };
};
CollapsifyHandler.prototype.onprocessinginstruction = function(name, data) {
  this._emitText();

  var lastElement = this._tagStack[this._tagStack.length - 1];

  var elem = {
    type: domelementtype.Directive,
    name: name,
    data: data,
    parent: lastElement
  };

  this.process.onNext({
    type: 'processinginstruction',
    elem: elem
  });
};
CollapsifyHandler.prototype.oncomment = function(comment) {
  this._emitText();

  var lastElement = this._tagStack[this._tagStack.length - 1];

  var elem = {
    type: domelementtype.Comment,
    data: comment,
    parent: lastElement
  };

  this._tagStack.push(elem);

  this.process.onNext({
    type: 'opencomment',
    elem: elem
  });
};
CollapsifyHandler.prototype.oncommentend = function() {
  this._emitText();

  var elem = this._tagStack.pop();
};
CollapsifyHandler.prototype.onend = function() {
  this._emitText();

  this.process.onCompleted();
};
CollapsifyHandler.prototype.onerror = function(err) {
  this._emitText();

  this.process.onError(err);
};
CollapsifyHandler.prototype._emitText = function() {
  if (this._currentText) {
    var elem = this._currentText;
    this._currentText = null;

    this.process.onNext({
      type: 'text',
      elem: elem
    });
  }
};

module.exports = CollapsifyHandler;
