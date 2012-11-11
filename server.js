var http = require('http'),
    fs = require('fs'),

    readme = fs.readFileSync('./index.html');

http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end(readme);
}).listen(8000);

console.log('Server running at http://0.0.0.0:8000/');
