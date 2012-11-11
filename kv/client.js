var Partitioner = require('../partitioning/partitioner.js'),
    FailureDetector = require('../failuredetect/failure_detector.js');

function KVClient() {
  this.partitioner = new Partitioner();
  this.failureDetector = new FailureDetector(3000);
}

KVClient.prototype.getPrimaryForKey = function(key) {
  var primary = this.partitioner.getNodeList(key, 1);
  return primary[0];
};

KVClient.prototype.set = function(key, value, W, N, callback) {
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

KVClient.prototype.get = function(key, R, callback) {

};

module.exports = KVClient;
