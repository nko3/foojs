var http = require('http'),
    url = require('url'),
    SloppyQuorum = require('../sloppyquorum/sloppy_quorum.js'),
    client = require('mixu_minimal').Client,
    MicroEE = require('microee'),
    MemTable = require('../sstable/memtable.js');

function QuorumRPCNode(config) {
  this.clientId = config.id;
  this.server = 'http://'+config.host+':'+config.port;
}

MicroEE.mixin(QuorumRPCNode);

QuorumRPCNode.prototype.send = function(message, callback){
  var self = this;
  console.log('rpcNode.send('+this.server, JSON.stringify(message));
  client
    .post(this.server + '/xserver')
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
  this.persistence = new MemTable();

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
  console.log('rpc', query);
  switch(query.op) {
    case 'write':
      // perform a quorum write
      this.write(query.key, query.value, parseInt(query.writeFactor, 10), function() {
        res.end(JSON.stringify({
          result: {
            from: self.quorum.id,
            ack: query.ack
          },
          args: 1
        }));
      });
      break;
    case 'read':
      // perform a quorum read
      this.read(query.key, parseInt(query.readFactor, 10), function(err, values){
        res.end(JSON.stringify({
          result: {
            from: self.quorum.id,
            ack: query.ack,
            value: values
          },
          args: 1
        }));
      });
      break;
    default:
      res.end(JSON.stringify({
        result: { ok: true, from: this.quorum.id },
        args: 1
      }));
  }
};

KVServer.prototype.xserver = function(query, res) {
  var a = query.args, self = this;
  console.log('xserver', query);
  //  {"op":"write","key":"aaa","value":{"value":"my-value","clock":{"1":1}},"ack":3}
  switch(query.op) {
    case 'write':
      // local write
      this.persistence.insert(query.key, JSON.stringify(query.value));
      res.end(JSON.stringify({
        result: { from: this.quorum.id, ack: query.ack },
        args: 1
      }));
      break;
    case 'read':
      // local read
      res.end(JSON.stringify({
        result: {
          from: this.quorum.id,
          ack: query.ack,
          value: JSON.parse(this.persistence.get(query.key))
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

// if this module is the script being run, then start up a server
if (module == require.main) {
  if(process.argv.length < 5) {
    console.log('Usage: node server.js id host:port servers');
    console.log('E.g.: node server.js 1 localhost:8000 1|localhost:8000,2|localhost:8001,3|localhost:8002');
    process.exit();
  }

  var id = process.argv[2],
      host = process.argv[3].split(':')[0],
      port = process.argv[3].split(':')[1],
      nodes = process.argv[4].split(',').map(function(s){
        var id = s.split('|')[0],
            parts = s.split('|')[1].split(':');
        return { id: id, host: parts[0], port: parts[1]};
      }),
      server = new KVServer(id, nodes);
  server.listen({ id: id, host: host, port: port }, function() {
    console.log('KV server (id='+id+') listening at '+host+':'+port);
    console.log('Nodes', nodes);
  });
}
