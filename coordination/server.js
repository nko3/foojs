var http = require('http'),
    url = require('url'),

    FailureDetector = require('../failuredetect/failure_detector.js');

function CoordinationServer() {
  this.server = null;
  this.detector = new FailureDetector(3000);
  this.clientId = 1;
}

CoordinationServer.prototype.listen = function(callback) {
  var self = this;
  this.server = http.createServer(function(req, res) {
    // determine the URL
    var parts = url.parse(req.url, true);
    res.setHeader('Content-type', 'application/json');
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
        self.detector.disconnect(parts.query.clientId);
        res.end(JSON.stringify({
          ok: true
        }));
        break;
      case '/rpc':
        self.detector.receive(parts.query.clientId);
        self.rpc(parts.query, res);
        break;
      default:
        res.statusCode = 500;
        res.end(JSON.stringify({
          ok: false,
          err: 'Unknown path: ' + JSON.stringify(parts)
        }));
    }
  }).listen(8000, callback);
};

CoordinationServer.prototype.close = function() {
  this.server.close();
};

CoordinationServer.prototype.rpc = function(query, res) {
  var a = query.args;
  switch(query.op) {
    case 'echo':
      console.log(query);
      res.end(JSON.stringify({
        ok: true,
        result: query.args
      }));
      break;
    case 'create':
      this.coordinator.create(a[0], a[1], a[2], function() {

      });
      break;
    case 'remove':
      this.coordinator.remove(a[0], a[1], function() {

      });
      break;
    case 'setData':
      this.coordinator.setData(a[0], a[1], a[2], function() {

      });
      break;
    case 'sync':
      this.coordinator.sync(a, function() {

      });
      break;
    case 'exists':
      this.coordinator.exists(a[0], function() {

      }, function() {

      });
      break;
    case 'getData':
      this.coordinator.getData(a[0], function() {

      }, function() {

      });
      break;
    case 'getChildren':
      this.coordinator.getChildren(a[0], function() {

      }, function() {

      });
      break;
    default:
      res.end(JSON.stringify({
        ok: true
      }));
  }
};

module.exports = CoordinationServer;
