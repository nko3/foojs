var assert = require('assert'),
    vclock = require('../vector_clock.js');

exports['given two clocks'] = {

  beforeEach: function() {
    this.a = { clock: {}};
    this.b = { clock: {}};
  },

  'at the same node': {
    'a clock incremented once should be greater than 0': function(){
      vclock.increment(this.a, 'node-1');
      assert.equal( vclock.compare(this.a, this.b), vclock.GT);
      assert.equal( vclock.compare(this.b, this.a), vclock.LT);
    },

    'a clock incremented twice should be greater than 1': function() {
      vclock.increment(this.a, 'node-1');
      vclock.increment(this.a, 'node-1');
      vclock.increment(this.b, 'node-1');
      assert.equal( vclock.compare(this.a, this.b), vclock.GT);
      assert.equal( vclock.compare(this.b, this.a), vclock.LT);
    },

    'two clocks with the same history should be equal and concurrent': function() {
      vclock.increment(this.a, 'node-1');
      vclock.increment(this.b, 'node-1');
      assert.equal( vclock.compare(this.a, this.b), vclock.CONCURRENT);
      assert.equal( vclock.compare(this.b, this.a), vclock.CONCURRENT);
    }
  },

  'at different nodes': {

    beforeEach: function() {
      vclock.increment(this.a, 'node-1');
      vclock.increment(this.b, 'node-1');
      vclock.increment(this.a, 'node-1');
      vclock.increment(this.b, 'node-2');
    },

    'clocks incremented at different nodes should be concurrent': function() {
      assert.equal( vclock.compare(this.a, this.b), vclock.CONCURRENT);
      assert.equal( vclock.compare(this.b, this.a), vclock.CONCURRENT);
      vclock.increment(this.a, 'node-1');
      assert.equal( vclock.compare(this.a, this.b), vclock.CONCURRENT);
      vclock.increment(this.b, 'node-2');
      vclock.increment(this.b, 'node-2');
      vclock.increment(this.b, 'node-2');
      assert.equal( vclock.compare(this.a, this.b), vclock.CONCURRENT);
    },

    'a merged clock should be greater than either of the clocks': function() {
      var newClock = { clock: vclock.merge(this.a, this.b) };
      assert.equal( vclock.compare(newClock, this.b), vclock.GT);
      assert.equal( vclock.compare(newClock, this.a), vclock.GT);

    }

  }

};

// if this module is the script being run, then run the tests:
if (module == require.main) {
  var mocha = require('child_process').spawn('mocha', [ '--colors', '--ui', 'exports', '--reporter', 'spec', __filename ]);
  mocha.stdout.pipe(process.stdout);
  mocha.stderr.pipe(process.stderr);
}
