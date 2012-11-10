var assert = require('assert'),
    Client = require('../client.js');

exports['given a client'] = {

  before: function() {
    this.client = new Client();
  },

  'can write a value': function(done) {
    this.client.set('foo', 'bar', 3, 3, function() {
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
