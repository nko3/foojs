/*

# Algorithm 1: Zab Phase 1: Discovery.

Follower F :
Send the message FOLLOWERINFO(F.acceptedEpoch) to L
upon receiving NEWEPOCH(e ) from L do
if e > F.acceptedEpoch then
F.acceptedEpoch ← e
// stored to non-volatile memory
Send ACKEPOCH(F.currentEpoch, F.history, F.lastZxid) to L
goto Phase 2
else if e < F.acceptedEpoch then
F.state ← election and goto Phase 0 (leader election)
end
end

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
F.history ← H
// stored to non-volatile memory
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


