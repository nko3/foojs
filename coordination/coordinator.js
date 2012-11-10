var Path = require('path');

function Coordinator(persistence) {
  // wrapper around:
  // - a ZAB-backed remote write
  // - a local SSTable
  this.persistence = persistence;

  this.id = 1;
}

// WRITE operations

Coordinator.prototype.create = function(path, data, flags, callback) {
  var self = this,
      queue = [];
  // check whether the item already exists
  if(this.persistence.has(path)) {
    return callback(new Error('Path exists'));
  }

  // iterate each part of the path
  var parts = path.split('/'),
      current = '';
  parts.pop();
  parts.forEach(function(p) {
    current += (current != '/' ? '/' : '') + p;
    if(!self.persistence.has(path)) {
      // create a node corresponding to each part of the path if it does not exist
      // and queue a transaction
      queue.push(function() {
        self.persistence.transact(self.makeTransaction(current, '', {}), function(err, value){
          var next = queue.shift();
          next && next();
        });
      });
    }
  });
  // for the containing directory, increment the version and queue a transaction
  // so that any watchers on the directory are triggered
  var parent = Path.normalize(path + '/../');
  if(this.persistence.has(parent)) {
    queue.push(function() {
      var meta = self.persistence.get(parent);
      self.persistence.transact(self.makeTransaction(parent, meta.value, {}), function(err, value){
        var next = queue.shift();
        next && next();
      });
    });
  }

  // create
  queue.push(function() {
    self.persistence.transact(self.makeTransaction(path, data, flags), function(err, value){
      var next = queue.shift();
      if(!next) {
        callback(err, value);
      } else {
        next();
      }
    });
  });

  queue[0]();
};

Coordinator.prototype.makeTransaction = function(path, data, flags) {
  // generate transaction
  var transaction = {
    type: 'write',
    key: path,
    value: data,
    meta: {
      ctime: new Date(),
      mtime: new Date(),
      version: 1,
      ephemeralOwner: 0 // The session id of the owner of this znode if the znode is an ephemeral node. If it is not an ephemeral node, it will be zero.
    }
  };
  // ephemeral
  if(flags.ephemeral) {
    transaction.meta.ephemeralOwner = this.id;
  }
  // sequential - iterate parent, then assign sequential name
  if(flags.sequential) {
    var parent = Path.dirname(path),
      children = this.persistence.getChildren(parent).map(function(item){
      if (item.substr(0, path.length) == path) {
        var num = parseInt(item.substr(path.length), 10);
        if(num) {
          return num;
        }
      }
      return false;
    }).filter(function(v) { return v; } ).sort(function(a,b) { return a - b; });
    if(children.length) {
      transaction.key = path + (children[children.length - 1] + 1);
    } else {
      transaction.key = path + '1';
    }
  }
  return transaction;
};

Coordinator.prototype.remove = function(path, version, callback) {
  var old = this.persistence.get(path);
  // check whether the item already exists
  if(!old) {
    return callback(new Error('Path does not exist'));
  }
  if(old.meta.version != version) {
    return callback(new Error('Version does not match'));
  }
  var transaction = {
    type: 'remove',
    key: path
  };
  this.persistence.transact(transaction, callback);
  // for the containing directory, increment the version and queue a transaction
  // so that any watchers on the directory are triggered
};

Coordinator.prototype.setData = function(path, data, version, callback) {
  var old = this.persistence.get(path);
  // check whether the item already exists
  if(!old) {
    return callback(new Error('Version does not match'));
  }
  if(version && old && old.meta.version != version) {
    return callback(new Error('Version does not match'));
  }
  // generate transaction
  var transaction = {
    type: 'write',
    key: path,
    value: data,
    meta: {
      ctime: old.meta.ctime,
      mtime: new Date(),
      version: old.meta.version + 1,
      ephemeralOwner: 0 // The session id of the owner of this znode if the znode is an ephemeral node. If it is not an ephemeral node, it will be zero.
    }
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
  callback(this.persistence.has(path));
};

Coordinator.prototype.getData = function(path, watcher, callback) {
  var meta = this.persistence.get(path);
  if(!meta) {
    return callback(new Error('Path does not exist'));
  }
  if(watcher) {
    this.persistence.watch(path, callback);
  }
  callback(undefined, meta.value, meta.meta);
};

Coordinator.prototype.getChildren = function(path, watcher, callback) {
  var meta = this.persistence.get(path);
  if(!meta) {
    return callback(new Error('Path does not exist'));
  }
  if(watcher) {
    this.persistence.watch(path, callback);
  }
  callback(this.persistence.getChildren(path));
};

module.exports = Coordinator;
