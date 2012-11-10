var assert = require('assert'),
    Partitioner = require('../partitioner.js');

function changeCount(a, b) {
  var count = 0;
  for(var i = 0; i < a.length; i++) {
    if(a[i] != b[i]) {
      count++;
    }
  }
  return count;
}

exports['foo'] = {

  'add': function() {

    var p = new Partitioner(),
        old = JSON.parse(JSON.stringify(p.vnodesToNodes));

    for(var i = 0; i < 11; i++) {
      p.addNode();
      console.log(old);
      console.log(p.vnodesToNodes);
      console.log(p.getNodeList('foo', 2));
      console.log('changed', changeCount(old, p.vnodesToNodes));
      old = JSON.parse(JSON.stringify(p.vnodesToNodes));
    }
  }
};

// if this module is the script being run, then run the tests:
if (module == require.main) {
  var mocha = require('child_process').spawn('mocha', [ '--colors', '--ui', 'exports', '--reporter', 'spec', __filename ]);
  mocha.stdout.pipe(process.stdout);
  mocha.stderr.pipe(process.stderr);
}

