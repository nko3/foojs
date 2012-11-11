var client = require('mixu_minimal').Client,
    MicroEE = require('microee');

function CoordinationClient() {
  this.ack = 1;
  this.server = '';
  this.clientId = 0;
  this.heartbeat = null;
  this.watches = new MicroEE();
}

CoordinationClient.prototype.connect = function(host, port, callback) {
  var self = this;
  this.server = 'http://'+host+':'+port;
  // send a connect package
  // start the heartbeat
  client
    .post(this.server + '/connect')
    .end(client.parse(function(err, data) {
      self.clientId = data.clientId;
      console.log(data);

      if(!self.heartbeat) {
        self.heartbeat = setInterval(function() {
        client
          .post(self.server + '/heartbeat')
          .data({
            clientId: self.clientId,
            op: 'heartbeat'
          }).end(client.parse(function(err, data) {
            // process response (maybe ACK)
            self.response(data);
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
    // register ack listen
    self.watches.once(data.ack, function() {
      console.log('ACK', data.ack);
      watcher();
    });
  }

  client
    .post(self.server + '/rpc')
    .data(data).end(client.parse(function(err, data) {
      if(err) throw err;
      console.log('result', data);
      if(data.args > 1) {
        callback.apply(this, [ err ].concat(data.result));
      } else {
        if(op == 'exists') {
          callback(data.result);
        } else {
          callback(err, data.result);
        }
      }
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
    .post(this.server + '/disconnect')
    .data({ clientId: this.clientId })
    .end(client.parse(function(err, data) {
      //console.log('disconnect result', data);
      // stop the heartbeat
      if(self.heartbeat) {
        clearInterval(self.heartbeat);
        self.heartbeat = null;
      }
      callback && callback();
    }));
};

CoordinationClient.prototype.response = function(messages) {
  var self = this;
  console.log('client heartbeat response', messages);
  if(Array.isArray(messages)) {
    messages.forEach(function(message) {
      if(message.ack) {
        self.watches.emit(message.ack, message);
      }
    });
  }
};

module.exports = CoordinationClient;
