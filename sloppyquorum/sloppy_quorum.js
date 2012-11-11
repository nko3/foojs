function SloppyQuorum(nodes) {
  this.nodes = nodes; // array of readable/writable streams
  this.ack = 1;
  this.maxTime = 30 * 1000;
};

SloppyQuorum.prototype.write = function(key, value, writeFactor, callback) {
  if(!key || !value || !writeFactor) {
    throw new Error('write() requires a key, value and a write factor.');
  }
  this._execute({
      op: 'write',
      key: key,
      value: value
    }, writeFactor, function(err, responses) {
      callback(err);
    });
};

SloppyQuorum.prototype.read = function(key, readFactor, callback) {
  if(!key || !readFactor) {
    throw new Error('write() requires a key and a write factor.');
  }
  this._execute({
    op: 'read',
    key: key
  }, readFactor, function(err, responses) {
    // TODO: read repair using vector clocks
    var canonicalResponse = responses[0].value;
    // combine with own read
    callback(err, canonicalResponse);
  });
};

SloppyQuorum.prototype._execute = function(message, minimum, callback) {
  var responses = [],
      nodesResponded = {},
      completed = false,
      self = this;
  this.nodes.forEach(function(node, index) {
    var ack = self.ack++;
    node.when('ack', function(message) {
      console.log('ack', message);
      var isMatch = (message.ack == ack);
      if(isMatch && !completed && !nodesResponded[node.clientId]) {
        responses.push(message);
        nodesResponded[node.clientId] = true;
        if(responses.length + 1 > minimum) {
          completed = true;
          callback(undefined, responses);
        }
      }
      return isMatch;
    });

    message.ack = ack;
    node.send(message);
  });
  // set a timeout for the operation
  setTimeout(function() {
    if(!completed) {
      callback(new Error('Quorum timed out'));
    }
  }, this.maxTime);
};

module.exports = SloppyQuorum;
