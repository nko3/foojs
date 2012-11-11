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
    writeFactor: W,
    replicationFactor: N
  }, callback);
};

KVClient.prototype.get = function(key, R, callback) {
  this._rpc(key, {
    op: 'read',
    key: key,
    readFactor: R
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
      console.log('client result', data);
      if(data.args > 1) {
        callback.apply(this, [ err ].concat(data.result));
      } else {
        if(data.result.value) {
          callback(err, data.result.value);
        } else {
          callback(err, data.result);
        }
      }
    }));
};

module.exports = KVClient;

// if this module is the script being run, then run a RPC
if (module == require.main) {
  if(process.argv.length < 5) {
    console.log('To write a key: node client.js write key value writeFactor serverlist');
    console.log('E.g.: node client.js write foo bar 3 "1|localhost:8000,2|localhost:8001,3|localhost:8002"');
    console.log('To read a key: node client.js read key readFactor serverlist');
    console.log('E.g.: node client.js read foo 2 "1|localhost:8000,2|localhost:8001,3|localhost:8002"');
    process.exit();
  }

  var op = process.argv[2],
      key = process.argv[3],
      value = (op == 'write' ? process.argv[4] : ''),
      factor = (op == 'write' ? process.argv[5] : process.argv[4]),
      nodes = (op == 'write' ? process.argv[6] : process.argv[5]).split(',').map(function(s){
        var id = s.split('|')[0],
            parts = s.split('|')[1].split(':');
        return { id: id, host: parts[0], port: parts[1]};
      }),
      kvclient = new KVClient();

  nodes.forEach(function(n) {
    kvclient.partitioner.addNode(n);
  });
  if(op == 'write') {
    kvclient.set(key, value, factor, factor, function(err, data) {
      if(err) throw err;
      console.log('Value set');
      process.exit();
    });
  } else if(op == 'read') {
    kvclient.get(key, factor, function(err, values) {
      if(err) throw err;
      console.log('Result', values.map(function(i) { return i.value; }));
      process.exit();
    });
  }
}
