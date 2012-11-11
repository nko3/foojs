var assert = require('assert'),
    Client = require('../client.js'),
    Server = require('../server.js');

exports['given a client and four servers'] = {

  before: function() {
    var self = this;
    this.client = new Client();
    this.servers = [];
    [
      { id: 1, host: 'localhost', port: 9001 },
      { id: 2, host: 'localhost', port: 9002 },
      { id: 3, host: 'localhost', port: 9003 },
      { id: 4, host: 'localhost', port: 9004 }
    ].forEach(function(n, index) {
      self.client.partitioner.addNode(n);
    });
  },

  // Tests about locating servers
  // TODO: link this to the failure detector information from coordination

  'when all nodes are up, can find the primary': function() {
    console.log(this.client.getPrimaryForKey('test'));
    assert.equal(this.client.getPrimaryForKey('test').id, 2);
  },

  'when some of the primary nodes are down, one of the remaining primaries is selected': function() {
    this.client.partitioner.removeNode(1);
    // console.log(this.client.getPrimaryForKey('test'));
    // can't really assert anything intelligent here until we have
    // more consistent behavior on removeNode()
  },

  'when all the primary nodes are down, a alternative node is used': function() {
    this.client.partitioner.removeNode(2);
    this.client.partitioner.removeNode(3);
    assert.equal(this.client.getPrimaryForKey('test').id, 4);
  },

  'when all the nodes are down, the write fails': function() {
    this.client.partitioner.removeNode(4);
    assert.ok(!this.client.getPrimaryForKey('test'));
  }

};

exports['given a client and four active servers'] = {

  before: function() {
    var self = this;
    this.client = new Client();
    this.servers = [];
    [
      { id: 1, host: 'localhost', port: 9001 },
      { id: 2, host: 'localhost', port: 9002 },
      { id: 3, host: 'localhost', port: 9003 },
      { id: 4, host: 'localhost', port: 9004 }
    ].forEach(function(n, index) {
      self.client.partitioner.addNode(n);
      self.servers[index] = new Server(n.id, self.servers);
      self.servers[index].listen(n);
    });
  },

  // tests about RPC

  'can write a value': function(done) {
    var self = this;
    this.client.set('foo', 'bar', 3, 3, function(err, data) {
      assert.equal(data.from, self.client.getPrimaryForKey('foo').id);
      done();
    });
  },

  'can read a value': function(done) {
    var self = this;
    this.client.get('foo', 3, function(err, data) {
      assert.equal(data.from, self.client.getPrimaryForKey('foo').id);
      console.log(err, data);
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
