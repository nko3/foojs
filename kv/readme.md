# KV

An open-source Dynamo-style distributed key-value store built with love (over 2 days)

## Features

- Written at Node Knockout 2012 in 48h
- Basically, a [Dynamo](http://www.allthingsdistributed.com/2007/10/amazons_dynamo.html) clone, but written from scratch and in JS.
- Stores keys and values replicated across a group of undifferentiated servers.
- Automatic partitioning based on a [distributed hash table](http://en.wikipedia.org/wiki/Distributed_hash_table) using [consistent hashing](http://en.wikipedia.org/wiki/Consistent_hashing) (with adjustable data placement)
- Repartitioning when a node fails or is added
- Replication: data is replicated to a sloppy quorum of peers; e.g. the values are [eventually consistent](http://www.allthingsdistributed.com/2007/12/eventually_consistent.html)
- Latency and availability (e.g. [the sizes of the read and write quorums](http://web.mit.edu/6.033/2005/wwwdocs/quorum_note.html)) are adjustable per-key
- Conflict resolution on read: [vector clocks](http://en.wikipedia.org/wiki/Vector_clock) are used to resolve inconsistent reads if possible

## Differences from Dynamo

- Doesn't use a gossip protocol for propagating information about group membership changes and node failures. Instead, a strongly consistent coordination service modeled after Zookeeper is used (also written at NKO - I call it Nookeeper for now).
- Merkle tree based anti-entropy is not implemented
- Hinted handoff is not implemented

## Installing

Will be on npm soonish.

## Starting the server

Starting the server: you need at least 3 instances of the server running since reads and writes go to multiple servers. Each server can be started with:

    node server.js id [host]:[port] [list-of-all-servers]

For example

    node server.js 1 localhost:8000 "1|localhost:8000,2|localhost:8001,3|localhost:8002"
    node server.js 2 localhost:8001 "1|localhost:8000,2|localhost:8001,3|localhost:8002"
    node server.js 3 localhost:8002 "1|localhost:8000,2|localhost:8001,3|localhost:8002"

The list of servers will go away once a rendezvous mechanism is provided from the Nookeeper servers.

You can run `node start.js` to do this - this has the benefit that all the servers are killed when you kill the launcher.

## Writing and reading keys and values

You can write and read keys from the command line:

    node client.js write foo bar 3 "1|localhost:8000,2|localhost:8001,3|localhost:8002"

writes the value `bar` the key `foo` to a quorum of 3 servers.

To read:

    node client.js read foo 2 "1|localhost:8000,2|localhost:8001,3|localhost:8002"

reads the key `foo` from a quorum of 2 servers.

There is also a Node API, read the tests for some examples - better documentation coming later.

