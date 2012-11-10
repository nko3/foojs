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
        res.end(JSON.stringify({
          ok: true
        }));
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

module.exports = CoordinationServer;
