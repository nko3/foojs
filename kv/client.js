var Partitioner = require('../partitioning/partitioner.js'),
    FailureDetector = require('../failuredetect/failure_detector.js'),
    client = require('mixu_minimal').Client;

function KVClient() {
  this.ack = 1;
  // TODO: there should be a "normal" partition state
  // and a "current" partition state
  //
  // The normal partition state is used to determine the
  // list of canonical primaries.
  //
  // When the canonical primaries are all offline, then
  // the "current" partition list is used to locate a hinted handoff server
  this.partitioner = new Partitioner();
  // TODO: hook up failure detector
  this.failureDetector = new FailureDetector(3000);
}

KVClient.prototype.getPrimaryForKey = function(key) {
  var primary = this.partitioner.getNodeList(key, 1);
  return primary[0];
};

KVClient.prototype.set = function(key, value, W, N, callback) {
  // connect to the primary and write the request
  this._rpc(key, {
    op: 'write',
    key: key,
    value: value,
    W: W,
    N: N
  }, callback);
};

KVClient.prototype.get = function(key, R, callback) {
  this._rpc(key, {
    op: 'read',
    key: key,
    R: R
  }, callback);
};

KVClient.prototype._rpc = function(key, message, callback) {
  // find out the primary
  var primary = this.getPrimaryForKey(key);
  console.log(primary);
  var server = 'http://'+primary.host+':'+primary.port;

  client
    .post(server + '/rpc')
    .data(message).end(client.parse(function(err, data) {
      if(err) throw err;
      console.log('result', data);
      if(data.args > 1) {
        callback.apply(this, [ err ].concat(data.result));
      } else {
        callback(err, data.result);
      }
    }));
};

module.exports = KVClient;
