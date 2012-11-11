var MicroEE = require('microee'),
    client = require('mixu_minimal').Client;

require('http').globalAgent.maxSockets = 10000;

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

module.exports = QuorumRPCNode;
