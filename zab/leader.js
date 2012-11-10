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

function Leader(id) {
  this.id = id;
  this.phase = 1;
  this.totalNodes = 3;
  this.quorumSize = 2;

  this.history = []; // a log of transaction proposals accepted
  this.acceptedEpoch = 0; // the epoch number of the last NEWEPOCH message accepted
  this.currentEpoch = 0 // the epoch number of the last NEWLEADER message accepted
  this.lastZxid = 0; // zxid of the last proposal in the history

  this.discoveryResponses = {};
  this.ackResponses = {};
  this.syncResponses = {};
  this.broadcastResponses = {};
}

require('util').inherits(Leader, require('events').EventEmitter);

Leader.prototype.execute = function() {
  // phase 1 is no-op
  if(this.phase == 2) {
    this.broadcast({
      type: 'NEWLEADER',
      epoch: this.currentEpoch,
      history: this.history
    });
  }
}

Leader.prototype.discovery = function(m) {
  var self = this;
  if(m.type == 'FOLLOWERINFO') {
    this.discoveryResponses[m.senderId] = m;

    if(Object.keys(this.discoveryResponses).length >= this.quorumSize) {
      var maxEpoch = Object.keys(this.discoveryResponses).reduce(function(prev, key){
        return Math.max(prev, self.discoveryResponses[key].epoch);
      }, 0);

      // implied?
      this.currentEpoch = maxEpoch + 1;
      console.log(this.discoveryResponses, this.currentEpoch);

      this.broadcast({
        type: 'NEWEPOCH',
        epoch: this.currentEpoch
      });
    }
  }
  if(m.type == 'ACKEPOCH') {
    this.ackResponses[m.senderId] = m;
    if(Object.keys(this.ackResponses).length >= this.quorumSize) {
      // first, sort by currentEpoch
      var sortedIds = Object.keys(this.ackResponses).sort(function(a, b) {
        if(a.currentEpoch - b.currentEpoch != 0) {
          return a.currentEpoch - b.currentEpoch;
        } else {
          return a.lastZxid - b.lastZxid;
        }
      });

      var chosen = sortedIds[0];
      this.history = this.ackResponses[chosen].history; // to non-volatile memory
      this.phase = 2;
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
  if(m.type == 'ACKNEWLEADER') {
    this.syncResponses[m.senderId] = m;
    if(Object.keys(this.syncResponses).length >= this.quorumSize) {
      this.broadcast({
        type: 'COMMIT'
      });
      this.phase = 3;
      this.emit('ready', this.currentEpoch);
    }
  }
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

Leader.prototype.write = function(value) {
  this.broadcast({
    type: 'PROPOSAL',
    value: value,
    zxid: {
      epoch: this.currentEpoch,
      counter: ++this.lastZxid
    }
  })
};

Leader.prototype.broadcastPhase = function(m) {
  if(m.type == 'ACK') {
    this.broadcastResponses[m.senderId] = m;
    if(Object.keys(this.broadcastResponses).length >= this.quorumSize) {
      this.broadcast({
        type: 'COMMIT',
        value: m.value,
        zxid: m.zxid
      });
    }
  }
  // Reaction to an incoming new follower:
  if(m.type == 'FOLLOWERINFO') {
    this.send(m.senderId, {
      type: 'NEWEPOCH',
      epoch: this.currentEpoch
    });
    this.send(m.senderId, {
      type: 'NEWLEADER',
      epoch: this.currentEpoch,
      history: this.history
    });
  }
  if(m.type == 'ACKNEWLEADER') {
    this.send(m.senderId, {
      type: 'COMMIT'
    });
    this.followers.push(m.senderId);
  }
};

Leader.prototype.message = function(m) {
  switch(this.phase) {
    case 1:
      this.discovery(m);
      break;
    case 2:
      this.synchronization(m);
      break;
    case 3:
      this.broadcastPhase(m);
      break;
  }
};

module.exports = Leader;
