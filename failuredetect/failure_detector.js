function FailureDetector(timeout) {
  var self = this;
  this.timeout = timeout;
  this.connections = {};
  this.interval = setInterval(function() {
    self.timeouts();
  }, timeout);
}

require('util').inherits(FailureDetector, require('events').EventEmitter);

// if you are the initiating party, call this
FailureDetector.prototype.connecting = function(to) {
  this.connections[to] = new Date().getTime();
};

// call this when the connection is established (either on the client, or on the server)
FailureDetector.prototype.connected = function(to) {
  this.connections[to] = new Date().getTime();
  this.emit('connect', to);
};

// call this for each message received from the other party (request or response)
FailureDetector.prototype.receive = function(from) {
  this.connections[from] = new Date().getTime();
};

// returns a function that you can pass to .on('close');
// triggers a disconnect if this occurs unexpectedly
FailureDetector.prototype.ungracefulDisconnectFn = function(from) {
  var self = this;
  return function() {
    self.disconnect(from);
  };
};

// call this for a graceful disconnect
FailureDetector.prototype.disconnect = function(from) {
  if(!this.connections[from]) return;
  delete this.connections[from];
  this.emit('disconnect', from);
};

FailureDetector.prototype.timeouts = function() {
  var maxAge = new Date().getTime() - this.timeout,
      self = this;
  Object.keys(this.connections).forEach(function(id) {
    if(self.connections[id] < maxAge) {
      self.disconnect(id);
    }
  });
};

module.exports = FailureDetector;
