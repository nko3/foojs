var assert = require('assert'),
    Coordinator = require('../coordinator.js'),
    MemoryPersistence = require('../memory_persistence.js');

exports['given a MemoryPersistence based coordinator'] = {

  before: function() {
    this.c = new Coordinator(new MemoryPersistence());
  },

  'can create a regular node': function(done) {
    this.c.create('/foo', 'bar', {}, function(name) {
      this.c.getData(function('/foo', false, function(data, stat) {
        assert.equal(data, 'bar');
        assert.equal(stat.ephemeralOwner, 0);
        done();
      });
    });
  },

  'can create a ephemeral node': function(done) {
    this.c.create('/foo', 'bar', { ephemeral: true }, function(name) {
      this.c.getData(function('/foo', false, function(data, stat) {
        assert.equal(data, 'bar');
        assert.equal(stat.ephemeralOwner, 1);
        done();
      });
    });
  },

  'can create a sequential node': function(done) {
    this.c.create('/foo', 'bar', { sequential: true }, function(name) {
      assert.ok(name.match(/\/foo[0-9]+/));
      this.c.getData(function('/foo', false, function(data, stat) {
        assert.equal(data, 'bar');
        assert.equal(stat.ephemeralOwner, 1);
        done();
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
