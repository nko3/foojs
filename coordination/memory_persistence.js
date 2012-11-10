var zxid = { epoch: 1, counter: 1 };

function MemoryPersistence() {
  this.isLeader = true;

  this.table = {};
}

require('util').inherits(MemoryPersistence, require('events').EventEmitter);

MemoryPersistence.prototype.has = function(path) {
  return !! this.table[path];
}

MemoryPersistence.prototype.get = function(path) {
  return this.table[path];
}

MemoryPersistence.prototype.transact = function(transaction, callback) {
   if(transaction.type == 'write') {
    var old = this.table[transaction.key];
    zxid.counter++;
    // assign zxids
    if(!old) {
      transaction.czxid = JSON.parse(JSON.stringify(zxid));
    }
    transaction.mzxid = JSON.parse(JSON.stringify(zxid));
    this.table[transaction.key] = { value: transaction.value, meta: transaction.meta };
    this.emit(transaction.key);
    callback(undefined, transaction.key);
  }
  if(transaction.type == 'remove') {
    delete this.table[transaction.key];
    this.emit(transaction.key);
    callback(undefined, transaction.key);
  }
  if(transaction.type == 'sync') {
    // no-op
    this.emit(transaction.key);
    callback(undefined, transaction.key);
  }
};

MemoryPersistence.prototype.watch = function(path, callback) {
  this.on(path, function() {
    callback(path);
  });
};

MemoryPersistence.prototype.getChildren = function(path){
  // will do this in the dumbest way possible,
  // sort the keys, find the index of the node, then get any keys
  // that come after it and start with the same prefix and don't have a slash
  //
  // more ideally, this should be reflected in memory after the read so that
  // we'd do a object traversal.
  if(!this.table[path]) return [];
  var sorted = Object.keys(this.table).sort(),
      index = sorted.indexOf(path),
      result = [];

  if(index == -1) return [];
  index++;

  while(sorted[index].substr(0, path.length) == path &&
        !sorted[index].substr(path.length+1).match(/\//) ) {
    result.push(sorted[index]);
    index++;
  }
  return result;
};

module.exports = MemoryPersistence;
