var MemTable = require('../sstable/memtable.js'),
    Leader = require('../zab/leader.js'),
    Follower = require('../zab/follower.js'),
    RPCNode = require('../kv/rpc_node.js');

var zxid = { epoch: 1, counter: 1 },
    cid = 1;

function ZabPersistence(isLeader, id, nodes) {
  var self = this;
  this.isLeader = isLeader;
  this.table = new MemTable();

  var qnodes = nodes.map(function(n) {
    // wrap each node into a function that has a send(message) function and a clientId
    return new RPCNode(n);
  });

  if(isLeader) {
    this.zab = new Leader(id);
    // the leader has a broadcast method
    this.zab.broadcast = function(message) {
//      console.log('broadcast', message);
      message.senderId = id;
      qnodes.forEach(function(node) {
        if(node.clientId == id) return;
//        console.log('send from ' + id +' to '+ node.clientId, message);
        node.send(message);
      });
    };
  } else {
    this.zab = new Follower(id);
  }
  // set up the send(to, message) method
  this.zab.send = function(to, message) {
    message.senderId = id;
//    console.log('send from ' + id +' to ' + to, message);
    if(to === 'leader') {
      qnodes[0].send(message);
    } else {
      for(var i = 0; i < qnodes.length; i++) {
        if(qnodes[i].clientId == to) {
          qnodes[i].send(message);
        }
      }
    }
  };
  this.zab.on('deliver', function(transaction, zxid) {
    // hook up the zab into the sstable, so that commits go into it
    console.log('deliver', id, transaction, zxid);

    // when transactions are delivered, commit them, then emit the ACK
     if(transaction.type == 'write') {
      var old = self.table[transaction.key];
      zxid.counter++;
      // assign zxids
      if(!old) {
        transaction.czxid = JSON.parse(JSON.stringify(zxid));
      }
      transaction.mzxid = JSON.parse(JSON.stringify(zxid));
      self.table[transaction.key] = { value: transaction.value, meta: transaction.meta };
      // always emit after the operation callback has run
      self.emit(transaction.key);
    }
    if(transaction.type == 'remove') {
      delete self.table[transaction.key];
      self.emit(transaction.key);
    }
    if(transaction.type == 'sync') {
      // no-op
      self.emit(transaction.key);
    }
  });
  this.zab.execute();
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
    // start a quorum to deliver the transaction
    this.zab.write(transaction, callback);
  } else {
    var commitId = cid++;
    // forward request to leader and return when it has commited it
    this.zab.when('deliver', function(value, zxid) {
      var isComplete = (commitId == value.commitId);
      if(isComplete) {
        callback(undefined);
      }
      return isComplete;
    });
    this.zab.send('leader', {
      type: 'request',
      value: transaction,
      commitId: commitId
    });
  }
};

ZabPersistence.prototype.watch = function(path, callback) {
  this.on(path, function() {
    callback(path);
  });
};

ZabPersistence.prototype.getChildren = function(path){
  if(!this.table[path]) return [];
  var sorted = Object.keys(this.table).sort(),
      index = sorted.indexOf(path),
      result = [];
  index++;
  if(index == 0 || !sorted[index]) return [];

  while(sorted[index] && sorted[index].substr(0, path.length) == path &&
        !sorted[index].substr(path.length+1).match(/\//) ) {
    result.push(sorted[index]);
    index++;
  }
  return result;
};

module.exports = ZabPersistence;
