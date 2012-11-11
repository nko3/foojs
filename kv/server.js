var http = require('http'),
    url = require('url'),
    SloppyQuorum = require('../sloppyquorum/sloppy_quorum.js'),
    client = require('mixu_minimal').Client,
    MicroEE = require('microee');

function QuorumRPCNode(config) {
  this.clientId = config.id;
  this.server = 'http://'+config.host+':'+config.port;
}

MicroEE.mixin(QuorumRPCNode);

QuorumRPCNode.prototype.send = function(message, callback){
  var self = this;
  console.log('rpcNode.send('+this.server, JSON.stringify(message));
  client
    .post(this.server + '/rpc')
    .data(message).end(client.parse(function(err, data) {
      if(err) throw err;
      console.log('result', data);
      // TODO: emit as "ack" for the quorum?
      if(data.result.value) {
        self.emit('ack', { ack: data.result.ack, value: data.result.value });
      } else {
        self.emit('ack', { ack: data.result.ack });
      }
      // if called directly (SloppyQuorum doesn't use send callbacks currently)
      if(callback) {
        if(data.args > 1) {
          callback.apply(this, [ err ].concat(data.result));
        } else {
          callback(err, data.result);
        }
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
        case '/xserver':
          self.xserver(query, res);
          break;
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
    case 'write':
      // TODO: quorum write
    case 'read':
      // TODO: quorum read
    default:
      res.end(JSON.stringify({
        result: { ok: true, from: this.quorum.id },
        args: 1
      }));
  }
};

KVServer.prototype.xserver = function(query, res) {
  var a = query.args, self = this;
  console.log(query);
  //  {"op":"write","key":"aaa","value":{"value":"my-value","clock":{"1":1}},"ack":3}
  switch(query.op) {
    case 'write':
      // TODO local write
      res.end(JSON.stringify({
        result: { from: this.quorum.id, ack: query.ack },
        args: 1
      }));
      break;
    case 'read':
      // TODO local read
      res.end(JSON.stringify({
        result: {
          from: this.quorum.id,
          ack: query.ack,
          value: { value: 'foobar', clock: {} }
        },
        args: 1
      }));
      break;
    default:
      res.end(JSON.stringify({
        result: { ok: true, from: this.quorum.id },
        args: 1
      }));
  }
};

KVServer.prototype.write = function(key, value, writeFactor, callback) {
  this.quorum.write(key, { value: value, clock: {} }, writeFactor, callback);
};

KVServer.prototype.read = function(key, readFactor, callback) {
  this.quorum.read(key, readFactor, callback);
};

module.exports = KVServer;
