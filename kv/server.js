function KVS() {
  this.online = {}; // set of servers that are online
}

KVS.prototype.setRequest = function(key, value, W, N) {

  // connect to N-1 other servers from the preference list

  // ensure that those servers are online (or select lower ranked servers if not)

  // update the vector clock

  // start a sloppy quorum with N writers (we don't do minimal quorums for now)

  // when ack counts == N, return
};

KVS.prototype.setQuorum = function(key, value, W, N) {
  // if I am not in the preference list, then do the hinted handoff based persistence
  // if I am in the preference list, then persist normally
};


KVS.prototype.getRequest = function(key, R) {

  // connect to R-1 other servers from the preference list

  // ensure that those servers are online (or select lower ranked servers if not)

  // send read request

  // when replies == R, perform read reconciliation

  // return one or more replies depending on the value of the vector clock

};

module.exports = KVS;
