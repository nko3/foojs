
function Coordinator(persistence) {
  // wrapper around:
  // - a ZAB-backed remote write
  // - a local SSTable
  this.persistence = persistence;
}

// WRITE operations

Coordinator.prototype.create = function(path, data, flags, callback) {
  // check whether the item already exists
  if(this.persistence.table.has(path)) {
    callback(new Error('Path exists'));
  }
  // generate transaction
  var transaction = {
    type: 'write',
    ctime: new Date(),
    mtime: new Date(),
    key: path,
    value: data,
    version: 1,
    flags: flags, // ephemeral, sequential, regular
    ephemeralOwner: 0, // The session id of the owner of this znode if the znode is an ephemeral node. If it is not an ephemeral node, it will be zero.
    numChildren: 0
  };
  // create
  this.transact(transaction, callback);
};

Coordinator.prototype.remove = function(path, version, callback) {
  var old = this.persistence.table.get(path);
  // check whether the item already exists
  if(!old) {
    callback(new Error('Path does not exist'));
  }
  if(old.version != version) {
    callback(new Error('Version does not match'));
  }
  var transaction = {
    type: 'remove',
    key: path
  };
  this.transact(transaction, callback);
};

Coordinator.prototype.setData = function(path, data, version, callback) {
  var old = this.table.get(path);
  // check whether the item already exists
  if(version && old && old.version != version) {
    callback(new Error('Version does not match'));
  }
  // generate transaction
  var meta = {
    type: 'write',
    mtime: new Date(),
    key: path,
    value: data,
    version: old.version + 1,
    ephemeralOwner: 0, // The session id of the owner of this znode if the znode is an ephemeral node. If it is not an ephemeral node, it will be zero.
    numChildren: 0
  };
  // write
  this.persistence.transact(transaction, callback);
};

Coordinator.prototype.sync = function(path, callback) {
  // initiate a ZAB write and only return after it has been committed
  var meta = {
    type: 'sync'

  };
  // write
  this.persistence.transact(transaction, callback);
};

// READ operations

Coordinator.prototype.exists = function(path, watcher, callback) {
  if(watcher) {
    this.persistence.watch(path, callback);
  }
  callback(this.persistence.table.has(path));
};

Coordinator.prototype.getData = function(path, watcher, callback) {
  if(watcher) {
    this.persistence.watch(path, callback);
  }
  callback(this.persistence.table.get(path));
};

Coordinator.prototype.getChildren = function(path, watch, callback) {
  callback({});
};

module.exports = Coordinator;
