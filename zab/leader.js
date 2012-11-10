/*

# Algorithm 1: Zab Phase 1: Discovery.

Leader L:
upon receiving FOLLOWERINFO(e) messages from a quorum Q of connected followers do
  Make epoch number e such that e > e for all e received through FOLLOWERINFO(e)
  Propose NEWEPOCH(e ) to all followers in Q
end
upon receiving ACKEPOCH from all followers in Q do
  Find the follower f in Q such that for all fb ∈ Q \ {f }:
  either fb .currentEpoch < f.currentEpoch
  or (fb .currentEpoch = f.currentEpoch) ∧ (fb .lastZxid <= f.lastZxid)
  L.history ← f.history
  // stored to non-volatile memory
  goto Phase 2
end
*/

function Leader() {
  this.phase = 1;
  this.totalNodes = 3;
  this.quorumSize = 2;

  this.discoveryResponses = {};
  this.ackResponses = {};
}

Leader.prototype.discovery = function(m) {
  if(m.type == 'FOLLOWERINFO') {
    this.discoveryResponses[m.senderId] = m;

    if(Object.keys(this.discoveryResponses).length > this.quorumSize) {
      var maxEpoch = Object.keys(this.discoveryResponses).reduce(function(prev, key){
        return Math.max(prev, self.discoveryResponses[key].epoch);
      }, 0);
      this.broadcast({
        type: 'NEWEPOCH',
        epoch: maxEpoch
      });
    }
  }
  if(m.type == 'ACKEPOCH') {
    this.ackResponses[m.senderId] = m;
    if(Object.keys(this.ackResponses).length > this.quorumSize) {
      // first, sort by currentEpoch
      var sortedIds = Object.keys(this.ackResponses).sort(function(a, b) {
        if(a.epoch - b.epoch != 0) {
          return a.epoch - b.epoch;
        } else {
          return a.lastZxid - b.lastZxid;
        }
      });
      var chosen = sortedIds[0];
      this.history = this.ackResponses[chosen].history; // to non-volatile memory
    }
  }
};

/*
# Algorithm 2: Zab Phase 2: Synchronization.

Leader L:
Send the message NEWLEADER(e , L.history) to all followers in Q
upon receiving ACKNEWLEADER messages from some quorum of followers do
  Send a COMMIT message to all followers
  goto Phase 3
end
*/

Leader.prototype.synchronization = function(m) {

};

/*
# Algorithm 3: Zab Phase 3: Broadcast.

Leader L:
upon receiving a write request v do
  Propose e , v, z to all followers in Q, where z = e , c , such that z succeeds all zxid
  values previously broadcast in e (c is the previous zxid’s counter plus an increment of one)
end
upon receiving ACK( e , v, z ) from a quorum of followers do
  Send COMMIT(e , v, z ) to all followers
end
// Reaction to an incoming new follower:
upon receiving FOLLOWERINFO(e) from some follower f do
  Send NEWEPOCH(e ) to f
  Send NEWLEADER(e , L.history) to f
end
upon receiving ACKNEWLEADER from follower f do
  Send a COMMIT message to f
  Q ← Q ∪ {f }
end

*/






