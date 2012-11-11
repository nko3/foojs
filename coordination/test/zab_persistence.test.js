var assert = require('assert'),
    Client = require('../client.js'),
    Server = require('../server.js'),
    ZabPersistence = require('../zab_persistence.js');

exports['given three servers using ZabPersistence'] = {

  before: function(done) {
    var self = this,
        nodes = [
          { id: 1, host: 'localhost', port: 9001 },
          { id: 2, host: 'localhost', port: 9002 },
          { id: 3, host: 'localhost', port: 9003 },
          { id: 4, host: 'localhost', port: 9004 }
        ],
        leader = 1;
    this.servers = [];
    nodes.forEach(function(n, index) {
      self.servers[index] = new Server(new ZabPersistence(n.id == leader, n.id, nodes));
      self.servers[index].listen(n);
    });
    this.client = new Client();
    this.client.connect('localhost', 9001, function wait() {
      if(self.servers[0].coordinator.persistence.zab.phase < 3) {
        setTimeout(wait, 100);
      } else {
        done();
      }
    });
  },

  after: function() {
    this.client.disconnect();
  },

  'can create a regular node': function(done) {
    var self = this;
    this.client.create('/aaa', 'bar', {}, function(err, name) {
      console.log(name);
      if(err) throw err;
      self.client.getData('/aaa', false, function(err, data, stat) {
        console.log(err, data, stat);
        assert.equal(data, 'bar');
        assert.equal(stat.ephemeralOwner, 0);
        done();
      });
    });
  },

};

// if this module is the script being run, then run the tests:
if (module == require.main) {
  var mocha = require('child_process').spawn('mocha', [ '--colors', '--ui', 'exports', '--reporter', 'spec', __filename ]);
  mocha.stdout.pipe(process.stdout);
  mocha.stderr.pipe(process.stderr);
}
