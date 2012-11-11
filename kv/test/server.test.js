var assert = require('assert'),
    Server = require('../server.js');

exports['given four servers'] = {

  before: function() {
    var self = this,
        nodes = [
          { id: 1, host: 'localhost', port: 9001 },
          { id: 2, host: 'localhost', port: 9002 },
          { id: 3, host: 'localhost', port: 9003 },
          { id: 4, host: 'localhost', port: 9004 }
        ];
    this.servers = [];
    nodes.forEach(function(n, index) {
      self.servers[index] = new Server(n.id, nodes);
      self.servers[index].listen(n);
    });
  },

  'each server excludes itself from the list of nodes': function() {
    var self = this;
    for(var i = 0; i < 4; i++) {
      assert.ok(!this.servers[i].quorum.nodes.some(function(n) {
        return n.id == self.servers[i].quorum.id;
      }));
    }
  },

  'the quorum nodes have a send() method which invokes the rpc method on the targeted server': function(done) {
    var self = this, server = this.servers[0],
        results = 0;

    server.quorum.nodes.forEach(function(node) {
      node.send({ hello: 'world' }, function(err, data){
        //console.log(err, data);
        assert.equal(data.from, node.clientId);
        results++;
        if(results == 3) {
          done();
        }
      });
    });
  },

  // TODO: tests about servers in the quorum going offline
  // and about selecting lower ranked servers
  // and about the hinted handoff:
  // if I am not in the preference list, then do the hinted handoff based persistence
  // if I am in the preference list, then persist normally

  'can write to a quorum': function(done) {
    var self = this, server = this.servers[0];
    server.write('aaa', 'my-value', 3, function(err) {
      if(err) throw err;
      done();
    });
  },

  'can read from a quorum': function(done) {
    var self = this, server = this.servers[0];
    server.read('aaa', 3, function(err, values) {
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
