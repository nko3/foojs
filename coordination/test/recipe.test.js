var assert = require('assert'),
    Server = require('../server.js'),
    Client = require('../client.js');

exports['given three coordinators'] = {
  before: function() {
    var self = this;
    this.server = new Server(new MemoryPersistence());
    this.server.listen(done);
  },

  beforeEach: function(done) {
    this.client = new Client();
    this.client.connect('localhost', 8000, done);
  },

  afterEach: function() {
    this.client.disconnect();
  },

  'can perform a leader election': function(done) {
    var self = this;
    // create a node: election/guid-n (sequential and ephemeral)
    this.c.create('/election/test-', '', { sequential: true, ephemeral: true}, function(err, name) {
      if(err) throw err;
      // get your own sequence number
      var mine = parseInt(name.substr('/election/test-'.length), 10);
      assert.ok(!isNaN(mine));
      // get all the children of election/
      self.c.getChildren('/election', false, function(children) {
        // if you are the smallest, you lead
        // else watch the smallest existing node that has a sequence number that is higher than yours
        console.log(mine, children);
        done();
        // when you receive a notification about the node being deleted
        // read the children of election/
        // if you are the smallest, you lead
        // else watch the smallest existing node that has a sequence number that is higher than yours
      });
    });
  }
};

// if this module is the script being run, then run the tests:
if (module == require.main) {
  var mocha = require('child_process').spawn('mocha', [ '--colors', '--ui', 'exports', '--reporter', 'spec', __filename ]);
  mocha.stdout.pipe(process.stdout);
  mocha.stderr.pipe(process.stderr);
}
