# nookeeper

An open-source Zookeeper-style distributed coordination system with strong consistency guarantees (built in 48h at NKO 2012)

## Features

- a centralized service for: maintaining configuration information, naming, providing distributed synchronization, and providing group services such as group membership and failure detection
- simple, filesystem-like API based on files and directories (basically stolen from Zookeeper)
- data is kept in memory (for fast operations) and also persisted into a write-ahead log
- writes are replicated in a strongly consistent manner using the ZAB, the Zookeeper atomic broadcast protocol; a protocol similar to Paxos
- sequential consistency: updates from a client will be applied in the order that they were sent
- atomicity: updates either succeed or fail. No partial results.
- reliability: once an update has been applied, it will persist from that time forward until a client overwrites it.
- fast reads: reads occur on one server (with watches to notify of subsequent changes if necessary)

## KV vs nookeeper

I wrote two systems during the Node Knockout hackathon, here are the differences:

- nookeeper is strongly consistent; kv is eventually consistent
- kv allows you to specify quorum sizes since inconsistent reads are allowed and reconciled using vector clocks. nookeeper always uses always uses a full quorum.
- in a partition, nookeeper chooses consistency; kv chooses availability
- kv can survive the loss of all server nodes up to the minimum quorum size for each operation (as long as the values have time to be replicated) because it uses sloppy quorums. nookeeper survives the loss of f nodes, where N > 2f, e.g. with N = 3 servers, f = 1; with N = 5, f = 2 and so on.

## Installing

Will be on npm soonish.

## Starting the server

Starting the server: you need at least 3 instances of the server running since reads and writes go to multiple servers. Each server can be started with:

    node server.js id [host]:[port] [list-of-all-servers]

For example

    node server.js 1 localhost:9000 "1|localhost:9000,2|localhost:9001,3|localhost:9002"
    node server.js 2 localhost:9001 "1|localhost:9000,2|localhost:9001,3|localhost:9002"
    node server.js 3 localhost:9002 "1|localhost:9000,2|localhost:9001,3|localhost:9002"

You can run `node start.js` to do this - this has the benefit that all the servers are killed when you kill the launcher.

## Client API

- `client.create(path, value, flags, callback)`: creates a node in the filesystem. The callback is `(err, name)` where name is the full name of the new node.
- `client.setData(path, value, version, callback)`: updates a node in the filesystem. The callback is `(err)`.
- `client.getData(path, watcher, callback)`: gets the data stored at a path. The watcher is a callback with no parameters, and gets triggered when a change occurs at the given path. The callback is `(err, data, stat)`, where data is the content, and stat is metadata about the node.
- `client.exists(path, watcher, callback)`: callback is called with `true` if the node exists and `false` if it does not.
- `client.remove(path, version, callback)`: removes the node at the path. The callback is `(err)`.
