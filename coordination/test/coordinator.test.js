var assert = require('assert'),
    Coordinator = require('../coordinator.js'),
    MemoryPersistence = require('../memory_persistence.js');

exports['given a MemoryPersistence based coordinator'] = {

  before: function() {
    this.c = new Coordinator(new MemoryPersistence());
  },

  'can create a regular node': function(done) {
    var self = this;
    this.c.create('/aaa', 'bar', {}, function(err, name) {
      if(err) throw err;
      self.c.getData('/aaa', false, function(err, data, stat) {
        assert.equal(data, 'bar');
        assert.equal(stat.ephemeralOwner, 0);
        done();
      });
    });
  },

  'can create a ephemeral node': function(done) {
    var self = this;
    this.c.create('/bbb', 'bar', { ephemeral: true }, function(err, name) {
      if(err) throw err;
      self.c.getData('/bbb', false, function(err, data, stat) {
        if(err) throw err;
        assert.equal(data, 'bar');
        assert.equal(stat.version, 1);
        assert.equal(stat.ephemeralOwner, 1);
        done();
      });
    });
  },

  'can create a sequential node': function(done) {
    var self = this;
    this.c.create('/a1/ccc', 'bar', { sequential: true }, function(err, name) {
      if(err) throw err;
      assert.ok(name.match(/\/a1\/ccc[0-9]+/));
      self.c.getData(name, false, function(err, data, stat) {
        if(err) throw err;
        assert.equal(data, 'bar');
        assert.equal(stat.ephemeralOwner, 0);
        self.c.create('/a1/ccc', 'bar', { sequential: true }, function(err, name2) {
          if(err) throw err;
          console.log(name, name2);
          assert.ok(name2.match(/\/a1\/ccc[0-9]+/));
          assert.notEqual(name2, name);
          done();
        });
      });
    });
  },

  'can update a nodes data': function(done) {
    var self = this;
    this.c.setData('/aaa', 'abc', 1, function(err) {
      if(err) throw err;
      self.c.getData('/aaa', false, function(err, data, stat) {
        assert.equal(data, 'abc');
        assert.equal(stat.version, 2);
        assert.equal(stat.ephemeralOwner, 0);
        done();
      });
    });
  },

  'can remove a node': function(done) {
    var self = this;
    this.c.exists('/aaa', false, function(result) {
      assert.ok(result);
      self.c.remove('/aaa', 2, function(err) {
        if(err) throw err;
        self.c.exists('/aaa', false, function(result) {
          assert.ok(!result);
          done();
        });
      });
    });
  },

  'can set a watch on a exists() call': function(done) {
    var self = this, assertions = 0;
    this.c.exists('/exists', function() {
      assert.equal(assertions, 2);
      done();
    }, function(result) {
      assert.equal(result, false);
      assertions++;
      self.c.create('/exists', 'foo', {}, function(err, name) {
        assert.equal(name, '/exists');
        assertions++;
      });
    });
  },

  'can set a watch on a getData() call': function(done) {
    var self = this, assertions = 0;
    this.c.getData('/getdata', function() {
      assert.equal(assertions, 2);
      done();
    }, function(err, data, stat) {
      assert.equal(data, null);
      assert.equal(stat, null);
      assertions++;
      self.c.create('/getdata', 'foo', {}, function(err, name) {
        assert.equal(name, '/getdata');
        assertions++;
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
