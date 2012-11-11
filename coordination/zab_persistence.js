var MemTable = require('../sstable/memtable.js'),
    Leader = require('../zab/leader.js'),
    Follower = require('../zab/follower.js');

var zxid = { epoch: 1, counter: 1 };

function ZabPersistence(isLeader) {
  var self = this;
  this.isLeader = isLeader;
  this.table = new MemTable();
  if(isLeader) {
    this.zab = new Leader();
    // the leader has a broadcast method
    this.zab.broadcast = function(message) {
      console.log('broadcast', message);
    };
  } else {
    this.zab = new Follower();
    this.zab.on('deliver', function(value, zxid) {
      // hook up the zab into the sstable, so that commits go into it
      console.log('deliver', value, zxid);
      self.table[value] = zxid;
    });
  }
  // set up the send(to, message) method
  this.zab.send = function(to, message) {
    console.log(to, message);
  };
}

require('util').inherits(ZabPersistence, require('events').EventEmitter);

ZabPersistence.prototype.has = function(path) {
  return !!this.table[path];
};

ZabPersistence.prototype.get = function(path) {
  return this.table[path];
};

ZabPersistence.prototype.transact = function(transaction, callback) {
  if(this.isLeader) {
    this.zab.write(transaction, callback);
  } else {
    // forward request to leader and return when it has commited it
    this.leaderConnection.when('commit', function(commitId) {
      var isComplete = (commitId == transaction.commitId);
      if(isComplete) {
        callback(undefined);
      }
      return isComplete;
    });
    this.leaderConnection.send({
      type: 'COMMITREQUEST',
      value: transaction
    });
  }
};

ZabPersistence.prototype.watch = function(path, callback) {
  // register a listener on change transactions about a path
};

module.exports = ZabPersistence;
