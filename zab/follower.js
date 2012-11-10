function zxidSort(a, b) {
  var epochCmp = a.epoch - b.epoch,
      counterCmp = a.counter - b.counter;
  if(epochCmp != 0) {
    return epochCmp;
  }
  return counterCmp;
}

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

function Follower(id) {
  this.id = id;
  this.phase = 1;

  this.history = []; // a log of transaction proposals accepted
  this.acceptedEpoch = 0; // the epoch number of the last NEWEPOCH message accepted
  this.currentEpoch = 0 // the epoch number of the last NEWLEADER message accepted
  this.lastZxid = 0; // zxid of the last proposal in the history
}

Follower.prototype.execute = function() {
  if(this.phase == 1) {
    // Send the message FOLLOWERINFO(F.acceptedEpoch) to L
    this.send('leader', {
      type: 'FOLLOWERINFO',
      epoch: this.acceptedEpoch
    });
  }
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
    } else if(m.epoch < this.acceptedEpoch) {
      this.state = 'ELECTION';
      this.phase = 0;
    }
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
  if(m.type == 'NEWLEADER') {
    if(this.acceptedEpoch == m.epoch && m.history) {
      // todo ATOMICALLY
      this.currentEpoch = m.epoch; // TODO flush to disk
      m.history
      .sort(zxidSort)
      .forEach(function(e) {
        acceptProposal(e, e.zxid, e.value);
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
    this.history.outstandingTransactions()
      .sort(zxidSort)
      .forEach(function(t) {
        self.emit('deliver', t.v, t.zxid);
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

Follower.prototype.broadcastPhase = function(m) {
  var self = this;
  if (this.isLeader) {
    this.emit('ready', this.currentEpoch);
  }
  if(m.type == 'PROPOSAL') {
    this.history.push(m); // with write-ahead logging
    this.send('leader', {
      type: 'ACK',
      value: m.value,
      zxid: m.zxid
    });
  }
  if(m.type == 'COMMIT') {
    if(this.outstandingTransactions().length > 0) {
      this.emit('deliver', t.value, t.zxid);
    } else {
      this.on('outstandingTransactionsDone', function() {
        self.emit('deliver', t.value, t.zxid);
      });
    }
  }

};

Follower.prototype.message = function(m) {
  switch(this.phase) {
    case 1:
      this.discoveryMessage(m);
      break;
    case 2:
      this.synchronization(m);
      break;
    case 3:
      this.broadcastPhase(m);
      break;
  }
};
module.exports = Follower;
