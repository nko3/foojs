var Partitioner = require('../partitioning/partitioner.js');

function KV() {
  this.partitioner = new Partitioner();
  this.partitioner.addNode();
  this.partitioner.addNode();
  this.partitioner.addNode();

  this.failureDetector = new FailureDetector();

}

KV.prototype.set = function(key, value, W, N, callback) {
  // find out the primary
  var primary = this.partitioner.getNodeList(key, 1);

  while(!this.failureDetector.isUp(primary)) {
    primary = this.partitioner.getNodeList(key, 1);
  }
  // connect to the primary and write the request
  this.send(primary, {
    key: key,
    value: value,
    W: W,
    N: N
  }, function(m) {
    callback(m);
  });
};

KV.prototype.get = function(key, R, callback) {

};

module.exports = KV;
