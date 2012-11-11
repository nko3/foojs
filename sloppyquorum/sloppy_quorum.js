var VClock = require('../vectorclock/vector_clock.js');

function SloppyQuorum(id, nodes) {
  this.nodes = nodes; // array of readable/writable streams
  this.ack = 1;
  this.maxTime = 30 * 1000;
  this.id = id;
};

SloppyQuorum.prototype.write = function(key, value, writeFactor, callback) {
  if(!key || !value || !writeFactor) {
    throw new Error('write() requires a key, value and a write factor.');
  }
  if(!value.clock) {
    throw new Error('write() value must contain a vector clock.');
  }

  VClock.increment(value, this.id);

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
    // read repair using vector clocks
    // sort the responses by the vector clocks
    responses.sort(VClock.descSort);
      // then compare them to the topmost (in sequential order, the greatest) item
    var repaired = responses.filter(function(item, index) {
      // always include the first item
      if(index == 0) return true;
      // if they are concurrent with that item, then there is a conflict
      // that we cannot resolve, so we need to return the item.

      return VClock.isConcurrent(item, responses[0])
         && !VClock.isIdentical(item, responses[0]);
    });
    console.log('responses', responses);
    console.log('repaired', repaired);
    // combine with own read
    callback(err, repaired);
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
        responses.push(message.value);
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
