

const http = require('http');

const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Hello World');
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});
/*
// input file, options and a callback
autotrace('test.png', {
    outputFile: 'testout.svg'
}, function (err, buffer) {
    if (!err) console.log('done');
});
*/