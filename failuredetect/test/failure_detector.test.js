var assert = require('assert'),
    FailureDetector = require('../failure_detector.js');

exports['given a server and a client'] = {

  beforeEach: function() {
    var server = this.server = {
      id: 1000,
      detector: new FailureDetector(100),
      onRequest: function(client, req) {
        switch(req) {
          case 'connect':
            server.detector.connected(client.id);
            client.close = server.detector.ungracefulDisconnectFn(client.id);
            break;
          case 'operation':
            server.detector.receive(client.id);
            break;
          case 'disconnect':
            server.detector.disconnect(client.id);
            break;
        }
        client.onResponse(req);
      }
    };
    var client = this.client = {
      id: 1,
      detector: new FailureDetector(100),
      connect: function() {
        client.detector.connecting(server.id);
        server.onRequest(client, 'connect');
      },
      heartbeat: function() {
        server.onRequest(client, 'operation');
      },
      message: function() {
        server.onRequest(client, 'operation');
      },
      onResponse: function(req) {
        switch(req) {
          case 'connect':
            client.detector.connected(server.id);
            break;
          case 'disconnect':
            client.detector.disconnect(server.id);
          default:
            client.detector.receive(server.id);
        }
      },
      disconnect: function() {
        server.onRequest(client, 'disconnect');
      }
    }
  },

  'can detect when a client is gone gracefully': function() {
    var notifications = [];
    this.server.detector.on('connect', function(id) {
      notifications.push({ op: 'connect', id: id});
    });
    this.server.detector.on('disconnect', function(id) {
      notifications.push({ op: 'disconnect', id: id});
    });
    this.client.connect();
    assert.equal(notifications[0].op, 'connect');
    assert.equal(notifications[0].id, this.client.id);
    this.client.message();
    this.client.disconnect();
    assert.equal(notifications[1].op, 'disconnect');
    assert.equal(notifications[1].id, this.client.id);
  },

  'can detect when a client is gone ungracefully due to timeout': function(done) {
    // e.g. client.close() is called to trigger an unexpected disconnect like a TCP close
    var notifications = [], client = this.client;
    this.server.detector.on('connect', function(id) {
      notifications.push({ op: 'connect', id: id});
    });
    this.server.detector.on('disconnect', function(id) {
      notifications.push({ op: 'disconnect', id: id});
    });
    this.client.connect();
    assert.equal(notifications[0].op, 'connect');
    assert.equal(notifications[0].id, this.client.id);
    this.client.message();
    // no messages for > 2 timeouts
    setTimeout(function() {
      assert.equal(notifications[1].op, 'disconnect');
      assert.equal(notifications[1].id, client.id);
      done();
    }, 210);
  },

  'can detect when a client is gone ungracefully from a connection drop': function() {
    var notifications = [], client = this.client;
    this.server.detector.on('connect', function(id) {
      notifications.push({ op: 'connect', id: id});
    });
    this.server.detector.on('disconnect', function(id) {
      notifications.push({ op: 'disconnect', id: id});
    });
    this.client.connect();
    assert.equal(notifications[0].op, 'connect');
    assert.equal(notifications[0].id, this.client.id);
    this.client.message();
    this.client.close(); // e.g. connection.on('close') is triggered
    assert.equal(notifications[1].op, 'disconnect');
    assert.equal(notifications[1].id, client.id);
  },

  'can detect when a server does not respond to the connect in time': function() {
    this.server.detector.on('connect', function(id) {
      notifications.push({ op: 'connect', id: id});
    });
    this.server.detector.on('disconnect', function(id) {
      notifications.push({ op: 'disconnect', id: id});
    });
  },

  'can detect when a server does not respond to a message in time': function() {

  },

  'can detect when a server is gone ungracefully': function() {

  }

};

// if this module is the script being run, then run the tests:
if (module == require.main) {
  var mocha = require('child_process').spawn('mocha', [ '--colors', '--ui', 'exports', '--reporter', 'spec', __filename ]);
  mocha.stdout.pipe(process.stdout);
  mocha.stderr.pipe(process.stderr);
}
