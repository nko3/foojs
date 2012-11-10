var assert = require('assert'),
    FailureDetector = require('../failure_detector.js');

exports['given a server and a client'] = {

  beforeEach: function() {
    var self = this;
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
            server.close = client.detector.ungracefulDisconnectFn(server.id);
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
    this.clientNotifications = [];
    this.serverNotifications = [];
    this.server.detector.on('connect', function(id) {
      self.serverNotifications.push({ op: 'connect', id: id});
    });
    this.server.detector.on('disconnect', function(id) {
      self.serverNotifications.push({ op: 'disconnect', id: id});
    });
    this.client.detector.on('connect', function(id) {
      self.clientNotifications.push({ op: 'connect', id: id});
    });
    this.client.detector.on('disconnect', function(id) {
      self.clientNotifications.push({ op: 'disconnect', id: id});
    });
  },

  'can detect when a client is gone gracefully': function() {
    var notifications = this.serverNotifications, client = this.client;
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
    var notifications = this.serverNotifications, client = this.client;
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
    var notifications = this.serverNotifications, client = this.client;
    this.client.connect();
    assert.equal(notifications[0].op, 'connect');
    assert.equal(notifications[0].id, client.id);
    this.client.message();
    this.client.close(); // e.g. connection.on('close') is triggered
    assert.equal(notifications[1].op, 'disconnect');
    assert.equal(notifications[1].id, client.id);
  },

  'can detect when a server does not respond to the connect in time': function(done) {
    var notifications = this.clientNotifications, client = this.client, server = this.server;
    // break the server's response
    server.onRequest = function() {};
    client.connect();
    setTimeout(function() {
      assert.equal(notifications[0].op, 'disconnect');
      assert.equal(notifications[0].id, server.id);
      done();
    }, 210);
  },

  'can detect when a server does not respond to a message in time': function(done) {
    var notifications = this.clientNotifications, client = this.client, server = this.server;
    client.connect();
    // break the server's response
    server.onRequest = function() {};
    client.message();
    setTimeout(function() {
      assert.equal(notifications[0].op, 'connect');
      assert.equal(notifications[0].id, server.id);
      assert.equal(notifications[1].op, 'disconnect');
      assert.equal(notifications[1].id, server.id);
      done();
    }, 210);
  },

  'can detect when a server is gone ungracefully': function() {
    var notifications = this.clientNotifications, client = this.client, server = this.server;
    client.connect();
    server.close();
    assert.equal(notifications[1].op, 'disconnect');
    assert.equal(notifications[1].id, server.id);
  }
};

// if this module is the script being run, then run the tests:
if (module == require.main) {
  var mocha = require('child_process').spawn('mocha', [ '--colors', '--ui', 'exports', '--reporter', 'spec', __filename ]);
  mocha.stdout.pipe(process.stdout);
  mocha.stderr.pipe(process.stderr);
}
