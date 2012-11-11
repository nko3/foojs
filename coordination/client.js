var client = require('mixu_minimal').Client;

function CoordinationClient() {
  this.ack = 1;
  this.server = '';
  this.clientId = 0;
  this.heartbeat = null;

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

      if(!self.heartbeat) {
        self.heartbeat = setInterval(function() {
        client
          .get(self.server + '/rpc')
          .data({
            clientId: self.clientId,
            op: 'heartbeat'
          }).end(client.parse(function(err, data) {
            // TODO: heartbeat returns information such
            // as watched data
          }));
        }, 2000);
      }
      callback();
    }));
};

CoordinationClient.prototype._rpc = function(op, args) {
  // if the last item is a function,
  // then trigger it when the response arrives (based on ACK)
  var callback, watcher, self = this, data = {
      clientId: self.clientId,
      op: op,
      args: args
    };
  if(typeof args[args.length -1 ] == 'function') {
    callback = args.pop();
  }
  if(typeof args[args.length -1 ] == 'function') {
    watcher = args.pop();
    data.ack = this.ack++;
    // TODO register ack listener
  }

  client
    .get(self.server + '/rpc')
    .data(data).end(client.parse(function(err, data) {
      if(err) throw err;
      // TODO: return processing
      callback(data);
    }));
};

['echo', 'create', 'remove',
 'setData', 'sync', 'exists',
 'getData', 'getChildren'].forEach(function(name) {
  CoordinationClient.prototype[name] = function() {
    this._rpc(name, Array.prototype.slice.apply(arguments));
  };
});

CoordinationClient.prototype.disconnect = function(callback) {
  var self = this;
  // send a disconnect package
  client
    .get(this.server + '/disconnect')
    .data({ clientId: this.clientId })
    .end(client.parse(function(err, data) {
      console.log(data);
      if(self.heartbeat) {
        clearInterval(self.heartbeat);
        self.heartbeat = null;
      }
      callback && callback();
    }));
  // stop the heartbeat
};

module.exports = CoordinationClient;
