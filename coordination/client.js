var client = require('mixu_minimal').Client;

function CoordinationClient() {
  this.ack = 1;
  this.server = '';
  this.clientId = 0;
}

CoordinationClient.prototype.connect = function(host, port, callback) {
  var self = this;
  this.server = 'http://'+host+':'+port;
  // send a connect package
  // start the heartbeat
  client
    .get(this.server + '/connect')
    .end(client.parse(function(err, data) {
      self.clientId = data.clientId;
      console.log(data);
      callback();
    }));
};

CoordinationClient.prototype._rpc = function() {
  // if the last item is a function,
  // then trigger it when the response arrives (based on ACK)
};

CoordinationClient.prototype.disconnect = function() {
  // send a disconnect package
  client
    .get(this.server + '/disconnect')
    .data({ clientId: this.clientId })
    .end(client.parse(function(err, data) {
      console.log(data);
      callback();
    }));
  // stop the heartbeat
};

module.exports = CoordinationClient;
