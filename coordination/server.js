var http = require('http'),
    url = require('url'),

    FailureDetector = require('../failuredetect/failure_detector.js'),
    Coordinator = require('./coordinator.js');

function CoordinationServer(persistence) {
  this.server = null;
  this.detector = new FailureDetector(3000);
  this.clientId = 1;
  this.coordinator = new Coordinator(persistence);

  // queue for watch responses
  this.responseQueue = {};
  this.waitingClients = {};
}

CoordinationServer.prototype.listen = function(config, callback) {
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
        case '/connect':
          var clientId = self.clientId++;
          // assign a client ID for the client
          self.detector.connected(clientId);
          res.end(JSON.stringify({
            ok: true,
            clientId: clientId
          }));
          break;
        case '/disconnect':
          self.detector.disconnect(query.clientId);
          res.end(JSON.stringify({
            ok: true,
            disconnect: query.clientId
          }));
          break;
        case '/rpc':
          self.detector.receive(query.clientId);
          self.rpc(query, res);
          break;
        case '/heartbeat':
          self.detector.receive(query.clientId);
          self.heartbeat(query, res);
          break;
        default:
          res.statusCode = 500;
          res.end(JSON.stringify({
            ok: false,
            err: 'Unknown path: ' + JSON.stringify(parts)
          }));
      }
    });
  }).listen(config.port, callback);
};

CoordinationServer.prototype.close = function() {
  this.server.close();
};

CoordinationServer.prototype.rpc = function(query, res) {
  var a = query.args, self = this;
  console.log(query);
  switch(query.op) {
    case 'echo':
      console.log(query);
      res.end(JSON.stringify({
        ok: true,
        result: query.args
      }));
      break;
    case 'create':
      // path, data, flags, callback
      this.coordinator.create(a[0], a[1], a[2], function(err, name) {
        // if a[2] (flags) .ephameral is set, then attach a handler
        if(a[2].ephemeral) {
          self.detector.when('disconnect', function(id) {
            var isMatch = (query.clientId == id);
            if(isMatch) {
              self.coordinator.getData(a[0], false, function(err, value, meta) {
                self.coordinator.remove(a[0], meta.version);
              });
            }
            return isMatch;
          });
        }
        res.end(JSON.stringify({
          args: 1,
          result: name
        }));
      });
      break;
    case 'remove':
      // path, version
      this.coordinator.remove(a[0], a[1], function(err) {
        res.end(JSON.stringify({
          args: 1,
          result: false
        }));
      });
      break;
    case 'setData':
      this.coordinator.setData(a[0], a[1], a[2], function(err, name) {
        res.end(JSON.stringify({
          args: 1,
          result: name
        }));
      });
      break;
    case 'sync':
      this.coordinator.sync(a, function() {

      });
      break;
    case 'exists':
      this.coordinator.exists(a[0], function() {
        if(query.ack) {
          if(!self.responseQueue[query.clientId]) {
            self.responseQueue[query.clientId] = [ { ack: query.ack } ];
          } else {
            self.responseQueue[query.clientId].push({ ack: query.ack });
          }
        }
      }, function(result) {
        res.end(JSON.stringify({
          args: 1,
          result: result
        }));
      });
      break;
    case 'getData':
      this.coordinator.getData(a[0], function() {
        if(query.ack) {
          if(!self.responseQueue[query.clientId]) {
            self.responseQueue[query.clientId] = [ { ack: query.ack } ];
          } else {
            self.responseQueue[query.clientId].push({ ack: query.ack });
          }
        }
      }, function(err, data, stat) {
        res.end(JSON.stringify({
          args: 2,
          result: [ data, stat ]
        }));
      });
      break;
    case 'getChildren':
      this.coordinator.getChildren(a[0], function() {
        if(query.ack) {
          if(!self.responseQueue[query.clientId]) {
            self.responseQueue[query.clientId] = [ { ack: query.ack } ];
          } else {
            self.responseQueue[query.clientId].push({ ack: query.ack });
          }
        }
      }, function() {

      });
      break;
    default:
      res.end(JSON.stringify({
        ok: true
      }));
  }
};

CoordinationServer.prototype.heartbeat = function(message, res) {
  var self = this;
  this.waitingClients[message.clientId] = res;
  setTimeout(function() {
    console.log('heartbeat return', message.clientId, self.responseQueue);
    if(self.waitingClients[message.clientId]) {
      delete self.waitingClients[message.clientId];
      if(self.responseQueue[message.clientId]) {
        res.end(JSON.stringify(self.responseQueue[message.clientId]));
        delete self.responseQueue[message.clientId];
      } else {
        res.end();
      }
    }
  }, 3000);
};

module.exports = CoordinationServer;

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
      server = new CoordinationServer();
  server.listen({ id: id, host: host, port: port }, function() {
    console.log('KV server (id='+id+') listening at '+host+':'+port);
    console.log('Nodes', nodes);
  });
}
