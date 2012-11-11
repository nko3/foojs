var assert = require('assert'),
    Server = require('../server.js'),
    Client = require('../client.js');

exports['given a server and a client'] = {

  before: function(done) {
    var self = this;
    this.server = new Server();

    this.serverNotifications = [];
    this.server.detector.on('connect', function(id) {
      self.serverNotifications.push({ op: 'connect', id: id});
    });
    this.server.detector.on('disconnect', function(id) {
      self.serverNotifications.push({ op: 'disconnect', id: id});
    });
    this.server.listen(done);
  },

  beforeEach: function() {
    this.client = new Client();
  },

  afterEach: function() {
    this.client.disconnect();
  },
/*
  'can connect to server and maintain heartbeat': function(done) {
    this.timeout(8000);
    var client = this.client, server = this.server, notifications = this.serverNotifications;
    this.client.connect('localhost', 8000, function() {
      assert.equal(client.clientId, 1);
      assert.equal(notifications.length, 1);
      // timeout length is 3 seconds so if the heartbeat doesn't work the client gets disconnected
      setTimeout(function() {
        assert.equal(notifications.length, 1);
        assert.equal(notifications[0].op, 'connect');
        assert.equal(notifications[0].id, client.clientId);
        done();
      }, 7000);
    });
  },
*/

  'given a connected client': {
    beforeEach: function(done) {
      this.client.connect('localhost', 8000, done);
    },

    'can make a RPC call': function(done) {
      this.client.echo('foo', 'bar', function(data) {
        assert.deepEqual(data, ['foo', 'bar']);
        done();
      });
    }
  }
};

// if this module is the script being run, then run the tests:
if (module == require.main) {
  var mocha = require('child_process').spawn('mocha', [ '--colors', '--ui', 'exports', '--reporter', 'spec', __filename ]);
  mocha.stdout.pipe(process.stdout);
  mocha.stderr.pipe(process.stderr);
}

