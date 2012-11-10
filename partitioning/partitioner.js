var crypto = require('crypto');

function Partitioner() {
  // the number Q, e.g. the maximum number of nodes
  // (e.g. the number of pieces the hash table output is split into)
  this.maxNodes = 12;
  // the number S, e.g. the determines the current ratio of vnodes to nodes
  this.currentNodes = 1;

  // array, size is the maxNodes, values are node ID numbers
  this.vnodesToNodes = [];
  for(var i = 0; i < this.maxNodes; i++) {
    this.vnodesToNodes[i] = 0;
  }
}

Partitioner.prototype.addNode = function() {
  // Change the table to i % currentNodes for each value.
  // Note that this reassigns almost all the nodes since the whole sequence changes
  // A better strategy would aim to reassign a minimum of nodes
  this.currentNodes++;
  for(var i = 0; i < this.maxNodes; i++) {
    this.vnodesToNodes[i] = i % this.currentNodes;
  }
};

// returns the node, and count nodes after it
Partitioner.prototype.getNodeList = function(key, count) {
  // 32bits from md5
  var num = parseInt(crypto.createHash('md5').update(key).digest('hex').substr(0, 8), 16),
      vnode = num % this.maxNodes,
      result = [];
  for(var i = 0; i < count; i++) {
    result.push(this.vnodesToNodes[ (vnode + i) % this.maxNodes ]);
  }
  return result;
};

// Must make sure that when the nodes are removed,
// the vnodes are allocated back in a way that divides them
// equally among the remaining nodes
Partitioner.prototype.removeNode = function() {
  this.currentNodes--;
  for(var i = 0; i < this.maxNodes; i++) {
    this.vnodesToNodes[i] = i % this.currentNodes;
  }
};

module.exports = Partitioner;
