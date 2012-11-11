var assert = require('assert'),
    SloppyQuorum = require('../sloppy_quorum.js'),
    MicroEE = require('microee'),
    VClock = require('../../vectorclock/vector_clock.js');

function FakeNode(id) {
  this.clientId = id;
  this.keys = {};
  this.isUp = true;
}

MicroEE.mixin(FakeNode);

FakeNode.prototype.send = function(message) {
  var self = this,
      // clone the message - it is coming from an external channel
      message = JSON.parse(JSON.stringify(message));
  // allow toggling the node
  if(!this.isUp) return;
  // emulate async call to native API
  process.nextTick(function() {
    switch(message.op) {
      case 'write':
        self.keys[message.key] = message.value;
        self.emit('ack', { ack: message.ack });
        break;
      case 'read':
        self.emit('ack', { ack: message.ack, value: self.keys[message.key] });
        break;
    }
  });
};

exports['given a quorum of five'] = {

  before: function() {
    this.nodes = [
      new FakeNode(2),
      new FakeNode(3),
      new FakeNode(4),
      new FakeNode(5),
    ];
    this.leader = new SloppyQuorum(1, this.nodes);
  },

  'can write a value': function(done) {
    this.leader.write('aaa', { value: 'beep', clock: {} }, 3, function(err) {
      if(err) throw err;
      done();
    });
  },

  'can read a value': function(done) {
    this.leader.read('aaa', 3, function(err, values) {
      if(err) throw err;
      assert.equal(values.length, 1);
      assert.equal(values[0].value, 'beep');
      done();
    });
  },

  'when the vector clocks have diverged, two different values are returned': function(done) {
    // manipulate one of the nodes in the top 3
    console.log(this.nodes[1]);
    this.nodes[0].keys['aaa'] = {
      value: 'foobar',
      clock: VClock.increment(this.nodes[0].keys['aaa'].clock, this.nodes[0].clientId)
    };

    this.leader.read('aaa', 3, function(err, values) {
      if(err) throw err;
      assert.equal(values.length, 1);
      assert.equal(values[0].value, 'foobar');
      done();
    });
  }


};

// if this module is the script being run, then run the tests:
if (module == require.main) {
  var mocha = require('child_process').spawn('mocha', [ '--colors', '--ui', 'exports', '--reporter', 'spec', __filename ]);
  mocha.stdout.pipe(process.stdout);
  mocha.stderr.pipe(process.stderr);
}
