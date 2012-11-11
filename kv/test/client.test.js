var assert = require('assert'),
    Client = require('../client.js'),
    Server = require('../server.js'),
    VClock = require('../../vectorclock/vector_clock.js');

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

    var self = this,
        nodes = [
          { id: 1, host: 'localhost', port: 9001 },
          { id: 2, host: 'localhost', port: 9002 },
          { id: 3, host: 'localhost', port: 9003 },
          { id: 4, host: 'localhost', port: 9004 }
        ];
    this.servers = [];
    nodes.forEach(function(n, index) {
      self.client.partitioner.addNode(n);
      self.servers[index] = new Server(n.id, nodes);
      self.servers[index].listen(n);
    });

    this.uniqueValue = Math.random();
  },

  // tests about RPC

  'can write a value': function(done) {
    var self = this;
    this.client.set('foo', this.uniqueValue, 3, 3, function(err, data) {
      if(err) throw err;
      assert.equal(data.from, self.client.getPrimaryForKey('foo').id);
      done();
    });
  },

  'can read a value': function(done) {
    var self = this;
    this.client.get('foo', 3, function(err, values) {
      if(err) throw err;
      assert.equal(values.length, 1);
      assert.equal(values[0].value, self.uniqueValue);
      done();
    });
  },

  'when one node has more up to date information, read repair picks the one with the greatest clock': function(done) {
    // manipulate one of the nodes in the top 3
    var old = JSON.parse(this.servers[0].persistence.get('foo'));
    old.value = 'foobar';
    old.clock = VClock.increment(old.clock, this.servers[0].quorum.id);
    this.servers[0].persistence.insert('foo', JSON.stringify(old));
    this.client.get('foo', 3, function(err, values) {
      if(err) throw err;
      assert.equal(values.length, 1);
      assert.equal(values[0].value, 'foobar');
      done();
    });
  },

  'when the vector clocks have diverged, two different values are returned': function(done) {
    var old = JSON.parse(this.servers[0].persistence.get('foo'));
    old.value = 'helloworld';
    old.clock = VClock.increment(old.clock, this.servers[0].quorum.id);
    this.servers[0].persistence.insert('foo', JSON.stringify(old));
    old = JSON.parse(this.servers[1].persistence.get('foo'));
    old.value = 'inconsistent';
    old.clock = VClock.increment(old.clock, this.servers[1].quorum.id);
    this.servers[1].persistence.insert('foo', JSON.stringify(old));
    this.client.get('foo', 3, function(err, values) {
      if(err) throw err;
      assert.equal(values.length, 2);
      assert.ok(values.some(function(i) {
        return i.value == 'helloworld';
      }));
      assert.ok(values.some(function(i) {
        return i.value == 'inconsistent';
      }));
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
