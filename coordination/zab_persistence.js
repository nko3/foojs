function ZabPersistence() {
  this.isLeader = true;
  this.zab = {}; // zab implementation
  this.leaderConnection = {}; // TCP socket

  // hook up the zab into the sstable, so that commits go into it
  this.table = new JSONTable();
  this.zab.persistence(this.table);
}

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
