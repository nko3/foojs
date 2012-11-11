// Sorted String Table - not particularly efficient since all the data is kept
// in memory but all I need is a write-ahead log which looks like a KV-store
// and that can be persisted.
//
// http://www.igvita.com/2012/02/06/sstable-and-log-structured-storage-leveldb/
// http://leveldb.googlecode.com/svn/trunk/doc/impl.html
//
// Though not quite as strictly implemented, as a lot of details are
// irrelavant unless you want to read someone elses file format or want
// to only keep the indices in memory - and that can be optimized later on.
//
function JSONTable(filepath) {
  var self = this;
  this.snapNum = 1;
  this.logNum = 0;
  this.memtable = {};
  // load the file
  this._load(filepath);

  // increment logNum once to come up with the new log file name
  this.logFileFD = null;
  this.logFile = fs.createWriteStream(filePath, { flags: 'a',
    encoding: null,
    mode: 0666 });

  this.logFile.on('open', function(fd) {
    self.logFileFD = fd;
  });
}

JSONTable.prototype._load = function(filepath) {

  // figure out pre-existing files
  // - same name, but number is appended (.log or .snap extensions)
  // - number is "snapnum"-"lognum" (e.g. foo-1.snap + foo-1-1.log)

  // load the most recent snapshot (ensure it has the completion marker, if not, show an error)

  // read each log file related to it, and apply the operations on the
  // in-memory structure.

  // update snapNum and logNum to the most recently read versions

};

JSONTable.prototype.get = function(key) {
  return this.memtable[key];
};

// like get, but returns true / false
JSONTable.prototype.has = function(key) {
  return !!this.memtable[key];
};

JSONTable.prototype.insert = function(key, value) {
  if(typeof value !== 'string') {
    throw new Error('SSTable values must be strings');
  }
  // write a insert into the log synchronously and fsync it
  this.logFile.write('..');
  fs.fsyncSync(this.logFileFD);

  // now update the in-memory copy
  this.memtable[key] = value;
}

JSONTable.prototype.remove = function(key) {
  // write a deletion instruction into the log and fsync it
  this.logFile.write('..');
  fs.fsyncSync(this.logFileFD);
  // now update the in-memory copy
  // TODO: delete marker ?
  delete this.memtable[key];
};

// writes a snapshot to disk
JSONTable.prototype._snapshot = function(filename) {
  // write the snapshot file (with snapnum +1)

  // write the completion marker

  // increment the snapshot number in memory

  // note that deletion markers should be kept around
  // to hide obsolete values present in older sorted tables
};


JSONTable.load = function(filepath) {
  return new SSTable(filepath);
};

module.exports = JSONTable;
