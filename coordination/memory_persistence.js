var zxid = { epoch: 1, counter: 1 };

function MemoryPersistence() {
  this.isLeader = true;

  this.table = {};
}

require('util').inherits(MemoryPersistence, require('events').EventEmitter);

MemoryPersistence.prototype.transact = function(transaction, callback) {
   if(transaction.type == 'write') {
    var old = this.table[transaction.key];
    zxid.counter++;
    // assign zxids
    if(!old) {
      transaction.czxid = JSON.parse(JSON.stringify(zxid));
    }
    transaction.mzxid = JSON.parse(JSON.stringify(zxid));
    this.table[transaction.key] = transaction.value;
    this.emit(transaction.key);
    callback(undefined);
  }
  if(transaction.type == 'remove') {
    delete this.table[transaction.key];
    this.emit(transaction.key);
    callback(undefined);
  }
  if(transaction.type == 'sync') {
    // no-op
    this.emit(transaction.key);
    callback(undefined);
  }
};

MemoryPersistence.prototype.watch = function(path, callback) {
  this.on(path, function() {
    callback(path);
  });
};
