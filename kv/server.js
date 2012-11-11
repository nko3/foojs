var http = require('http'),
    url = require('url'),
    SloppyQuorum = require('../sloppyquorum/sloppy_quorum.js'),
    client = require('mixu_minimal').Client;

function QuorumRPCNode(config) {
  this.id = config.id;
  this.server = 'http://'+config.host+':'+config.port;
}

QuorumRPCNode.prototype.send = function(message, callback){
  client
    .post(this.server + '/rpc')
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

function KVServer(id, nodes) {
  this.server = null;
  var qnodes = nodes.filter(function(n) {
    // exclude own id from nodes
    if(n.id == id) return false;
    return true;
  }).map(function(n) {
    // wrap each node into a function that has a send(message) function and a clientId
    return new QuorumRPCNode(n);
  });
  this.quorum = new SloppyQuorum(id, qnodes);
}

KVServer.prototype.listen = function(configuration, callback) {
  var self = this;
  this.server = http.createServer(function(req, res) {
    // determine the URL
    var parts = url.parse(req.url, true);
    res.setHeader('Content-type', 'application/json');

    var data = '';
    req
    .on('data', function(chunk) { data += chunk; })
    .on('end', function() {
      var query = {};
      if(data.length > 0) {
        try {
          query = JSON.parse(data);
        } catch(e) {
          res.end();
          console.log('Could not parse POST data as JSON', data);
        }
      }

      switch(parts.pathname) {
        case '/rpc':
          self.rpc(query, res);
          break;
        default:
          res.statusCode = 500;
          res.end(JSON.stringify({
            ok: false,
            err: 'Unknown path: ' + JSON.stringify(parts)
          }));
      }
    });
  }).listen(configuration.port, callback);
};

KVServer.prototype.close = function() {
  this.server.close();
};

KVServer.prototype.rpc = function(query, res) {
  var a = query.args, self = this;
  console.log(query);
  switch(query.op) {
    default:
      res.end(JSON.stringify({
        result: { ok: true, from: this.quorum.id, },
        args: 1
      }));
  }
};

KVServer.prototype.setRequest = function(key, value, W, N) {
  // connect to N-1 other servers from the preference list

  // ensure that those servers are online (or select lower ranked servers if not)

  // update the vector clock

  // start a sloppy quorum with N writers (we don't do minimal quorums for now)

  // when ack counts == N, return
};

KVServer.prototype.setQuorum = function(key, value, W, N) {
  // if I am not in the preference list, then do the hinted handoff based persistence
  // if I am in the preference list, then persist normally
};


KVServer.prototype.getRequest = function(key, R) {

  // connect to R-1 other servers from the preference list

  // ensure that those servers are online (or select lower ranked servers if not)

  // send read request

  // when replies == R, perform read reconciliation

  // return one or more replies depending on the value of the vector clock

};

module.exports = KVServer;
