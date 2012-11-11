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

    'disconnecting triggers notification on server': function(done) {
      var self = this;
      this.server.detector.once('disconnect', function(id) {
        assert.equal(id, self.client.clientId);
        done();
      });
      this.client.disconnect();
    },

    'can make a RPC call': function(done) {
      this.client.echo('foo', 'bar', function(err, data) {
        assert.deepEqual(data, ['foo', 'bar']);
        done();
      });
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

    'can update a nodes data': function(done) {
      var self = this;
      this.client.setData('/aaa', 'abc', 1, function(err) {
        if(err) throw err;
        self.client.getData('/aaa', false, function(err, data, stat) {
          assert.equal(data, 'abc');
          assert.equal(stat.version, 2);
          assert.equal(stat.ephemeralOwner, 0);
          done();
        });
      });
    },

    'can remove a node': function(done) {
      var self = this;
      this.client.exists('/aaa', false, function(result) {
        assert.ok(result);
        self.client.remove('/aaa', 2, function(err) {
          if(err) throw err;
          self.client.exists('/aaa', false, function(result) {
            assert.ok(!result);
            done();
          });
        });
      });
    },

    'can create an ephemeral node, and when the client disconnects it is deleted': function(done) {
      var self = this;
      this.client.create('/eee', 'abc', { ephemeral: true }, function(err, name) {
        console.log(name);
        if(err) throw err;
        self.client.disconnect();
        setTimeout(function() {
          self.server.coordinator.exists('/eee', false, function(result) {
            assert.ok(!result);
            done();
          });
        }, 100);
      });
    },

    'can set a watch on a exists() call': function(done) {
      this.timeout(6000);
      var self = this, assertions = 0;
      this.client.exists('/exists', function() {
        assert.equal(assertions, 2);
        done();
      }, function(result) {
        assert.equal(result, false);
        assertions++;
        self.client.create('/exists', 'foo', {}, function(err, name) {
          assert.equal(name, '/exists');
          assertions++;
        });
      });
    },

    'can set a watch on a getData() call': function(done) {
      this.timeout(6000);
      var self = this, assertions = 0;
      this.client.getData('/getdata', function() {
        assert.equal(assertions, 2);
        done();
      }, function(err, data, stat) {
        assert.equal(data, null);
        assert.equal(stat, null);
        assertions++;
        self.client.create('/getdata', 'foo', {}, function(err, name) {
          assert.equal(name, '/getdata');
          assertions++;
        });
      });
    },

    'can set a watch on a getChildren() call': function(done) {
      done();
    }

  }
};

// if this module is the script being run, then run the tests:
if (module == require.main) {
  var mocha = require('child_process').spawn('mocha', [ '--colors', '--ui', 'exports', '--reporter', 'spec', __filename ]);
  mocha.stdout.pipe(process.stdout);
  mocha.stderr.pipe(process.stderr);
}

