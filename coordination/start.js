var child_process = require('child_process');

// starts multiple server processes at a time,
// and kills them when you close this script.

function spawn(command, args) {
  console.log(command + ' ' + args.join(' '));
  var ps = child_process.spawn(command, args, { cwd: __dirname,
    env: process.env
  });
  ps.stdout.pipe(process.stdout);
  ps.stderr.pipe(process.stderr);
  ps.on('exit', function(code, signal) {
    console.log('child process exited', code, signal);
  });
  process.on('exit', function() {
    ps.kill();
  });
}

var servers = '1|localhost:9000,2|localhost:9001,3|localhost:9002';

spawn('node', ['server.js', '1', '0.0.0.0:9000', servers]);
spawn('node', ['server.js', '2', '0.0.0.0:9001', servers]);
spawn('node', ['server.js', '3', '0.0.0.0:9002', servers]);
