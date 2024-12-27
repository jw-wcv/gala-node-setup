const http = require('http');

// Define the request handler
const requestHandler = (req, res) => {
    if (req.method === 'GET' && req.url === '/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success' }));
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
};

// Create the server
const server = http.createServer(requestHandler);

// Start the server on port 8080
server.listen(8080, '::', () => {
    console.log('Server is running on port 8080 and accessible via IPv6');
});
