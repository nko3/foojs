var assert = require('assert'),
    fs = require('fs'),
    JSONTable = require('../sstable.js');

exports['given a JSONTable'] = {
  before: function(done) {
    // create temp dir if needed
    console.log(__dirname + '/temp');
    if (!fs.existsSync(__dirname + '/temp')) {
      fs.mkdirSync(__dirname + '/temp');
    }
    // empty the temp dir
    this.persistence = new JSONTable(__dirname + '/temp/test1', done);
  },

  'can insert a value': function() {
    this.persistence.insert('foo', 'bar');
    assert.equal(this.persistence.get('foo'), 'bar');
  },

  'can remove a value': function() {
    this.persistence.remove('foo');
    assert.equal(typeof this.persistence.get('foo'), 'undefined');
  },

  'can close log': function() {

  },

  'can write a new snapshot': function() {

  },

  'can read snapshot': function() {

  }

};

// if this module is the script being run, then run the tests:
if (module == require.main) {
  var mocha = require('child_process').spawn('mocha', [ '--colors', '--ui', 'exports', '--reporter', 'spec', __filename ]);
  mocha.stdout.pipe(process.stdout);
  mocha.stderr.pipe(process.stderr);
}
