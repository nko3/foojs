function MemTable() {
  this.memtable = {};
}

MemTable.prototype.get = function(key) {
  return this.memtable[key];
};

MemTable.prototype.has = function(key) {
  return !!this.memtable[key];
};

MemTable.prototype.insert = function(key, value) {
  if(typeof value !== 'string') {
    throw new Error('SSTable values must be strings');
  }
  // now update the in-memory copy
  this.memtable[key] = value;
}

MemTable.prototype.remove = function(key) {
  // TODO: delete marker ?
  delete this.memtable[key];
};

module.exports = MemTable;
