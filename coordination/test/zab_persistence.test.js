var assert = require('assert'),
    Server = require('../server.js'),
    ZabPersistence = require('../zab_persistence.js');

exports['given three servers using ZabPersistence'] = {

  before: function() {
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
      self.servers[index] = new Server(new ZabPersistence(n.id == leader), n.id, nodes);
      self.servers[index].listen(n);
    });

  },

  'it works': function() {

  }
};

// if this module is the script being run, then run the tests:
if (module == require.main) {
  var mocha = require('child_process').spawn('mocha', [ '--colors', '--ui', 'exports', '--reporter', 'spec', __filename ]);
  mocha.stdout.pipe(process.stdout);
  mocha.stderr.pipe(process.stderr);
}
