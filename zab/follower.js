/*

# Algorithm 1: Zab Phase 1: Discovery.

Follower F :

Send the message FOLLOWERINFO(F.acceptedEpoch) to L
upon receiving NEWEPOCH(e ) from L do
  if e > F.acceptedEpoch then
    F.acceptedEpoch ← e // stored to non-volatile memory
    Send ACKEPOCH(F.currentEpoch, F.history, F.lastZxid) to L
    goto Phase 2
  else if e < F.acceptedEpoch then
    F.state ← election and goto Phase 0 (leader election)
  end
end

*/

function Follower() {
  this.phase = 1;
  this.acceptedEpoch = null;
  this.currentEpoch = ???;
  this.history = [];
  this.lastZxid = ???;
}

Follower.prototype.discovery = function() {
  // Send the message FOLLOWERINFO(F.acceptedEpoch) to L
  this.send('leader', {
    type: 'FOLLOWERINFO',
    epoch: this.acceptedEpoch
  });
};

Follower.prototype.discoveryMessage = function(m) {
  if(m.type == 'NEWEPOCH') /* && m.source == 'leader' */ {
    if(m.epoch > this.acceptedEpoch) {
      this.acceptedEpoch = m.epoch;
      // TODO flush to disk
      this.send('leader', {
        type: 'ACKEPOCH',
        currentEpoch: this.currentEpoch,
        history: this.history,
        lastZxid: this.lastZxid
      });
      this.phase = 2;
    }
  }
};

Follower.prototype.message = function(m) {
  switch(this.phase) {
    case 1:
      this.discoveryMessage(m);
    case 2:
      this.synchronization(m);
    case 3:
      this.broadcast(m);
  }
};

/*
# Algorithm 2: Zab Phase 2: Synchronization.

Follower F :
upon receiving NEWLEADER(e , H) from L do
  if F.acceptedEpoch = e then
    atomically
      F.currentEpoch ← e
      // stored to non-volatile memory
      for each v, z ∈ H, in order of zxids, do
        Accept the proposal e , v, z
      end
      F.history ← H // stored to non-volatile memory
    end
    Send an ACKNEWLEADER(e , H) to L
  else
    F.state ← election and goto Phase 0
  end
end
upon receiving COMMIT from L do
  for each outstanding transaction v, z ∈ F.history, in order of zxids, do
    Deliver v, z
  end
  goto Phase 3
end
*/

Follower.prototype.synchronization = function(m) {
  var self = this;
  if(m.type == 'NEWELADER') {
    if(this.acceptedEpoch == m.epoch && m.history) {
      // todo ATOMICALLY
      this.currentEpoch = m.epoch; // TODO flush to disk
      m.history.sort(function(a, b){
        return b.zxid - a.zxid;
      }).forEach(function(e) {
        acceptProposal(e, e.z, e.v);
      });
      this.history = m.history;
      // end ATOMICALLY
      this.send('leader', {
        type: 'ACKNEWLEADER',
        epoch: this.currentEpoch,
        history: m.history
      });
    }
  }
  if(m.type == 'COMMIT') {
    this.history.outstandingTransactions().sort(function(a, b) {
      return b.zxid - a.zxid;
    }).forEach(function(t) {
      self.emit('deliver', t.v, t.z);
    });
    this.state = 3;
  }
};

/*
# Algorithm 3: Zab Phase 3: Broadcast.

Follower F :
if F is leading then Invokes ready(e )
upon receiving proposal e , v, z from L do
  Append proposal e , v, z to F.history
  Send ACK( e , v, z ) to L
end
upon receiving COMMIT(e , v, z ) from L do
  while there is some outstanding transaction v , z ∈ F.history such that z
    Do nothing (wait)
  end
  Commit (deliver) transaction v, z
end

*/

Follower.prototype.broadcast = function(m) {
  var self = this;
  if (this.isLeader) {
    this.emit('ready', this.currentEpoch);
  }
  if(m.type == 'PROPOSAL') {
    this.history.push(m); // with write-ahead logging
    this.send('leader', {
      type: 'ACK',
      v: m.v,
      z: m.z
    });
  }
  if(m.type == 'COMMIT') {
    if(this.outstandingTransactions().length > 0) {
      this.emit('deliver', t.v, t.z);
    } else {
      this.on('outstandingTransactionsDone', function() {
        self.emit('deliver', t.v, t.z);
      });
    }
  }

};

module.exports = Follower;
