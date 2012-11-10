var assert = require('assert'),
    Leader = require('../leader.js'),
    Follower = require('../follower.js');

exports['given 3 peers'] = {

  before: function() {
    var leader = this.leader = new Leader('leader'),
        peers = this.peers = [ new Follower(1), new Follower(2)];

    // set up message sending (emulate the native TCP calls via process.nextTick)

    Follower.prototype.send = Leader.prototype.send = function(to, message) {
      var self = this;
      message.senderId = this.id;
      if(to === 'leader') {
        process.nextTick(function() {
          console.log('send from ' + self.id +' to ' + to, message);
          leader.message(message);
        });
      } else {
        process.nextTick(function() {
          console.log('send from ' + self.id +' to ' + to, message);
          peers[(to - 1)].message(message);
        });
      }
    };

    Leader.prototype.broadcast = function(message) {
      var self = this;
      process.nextTick(function() {
        console.log('send from ' + self.id +' to 1', message);
        peers[0].message(message);
      });
      process.nextTick(function() {
        console.log('send from ' + self.id +' to 2', message);
        peers[1].message(message);
      });
    };

    peers.forEach(function(p) {
      p.on('deliver', function(value, zxid) {
        console.log('deliver', value, zxid);
      });
    });
  },

  'when the peers acceptedEpoch is zero, the first phase completes': function(done) {
    var peers = this.peers, leader = this.leader;
    leader.execute();
    peers.forEach(function(p) {
      p.execute();
    });

    // assert that peers are in phase 2 (synchronization)
    setTimeout(function() {
      assert.equal(peers[0].phase, 2);
      assert.equal(peers[1].phase, 2);
      assert.equal(leader.phase, 2);
      done();
    }, 10);
  },

  'the second phase succeeds with acceptedEpoch, history empty': function(done){
    var peers = this.peers, leader = this.leader,
        readyEmitted = false;

    leader.on('ready', function() {
      readyEmitted = true;
    });

    leader.execute();
    peers.forEach(function(p) {
      p.execute();
    });

    // assert that peers are in phase 3 (broadcast)
    setTimeout(function() {
      assert.equal(peers[0].phase, 3);
      assert.equal(peers[1].phase, 3);
      assert.equal(leader.phase, 3);
      assert.ok(readyEmitted);
      done();
    }, 10);
  },

  'in phase 3, writing from the leader will deliver the value on the followers': function(done) {
    var peers = this.peers, leader = this.leader,
        deliveries = {};
    leader.write('foo');
    peers.forEach(function(p) {
      p.on('deliver', function(value, zxid) {
        deliveries[p.id] = { value: value,  zxid: zxid };
        if(Object.keys(deliveries).length == 2) {
          // deliveries were done
          assert.ok(true);
          done();
        }
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
