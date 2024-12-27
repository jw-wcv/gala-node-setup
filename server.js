const http = require('http');
const fs = require('fs');
const { exec } = require('child_process');

// Constants
const API_KEY_FILE = 'api_key.txt';
const SETUP_STATUS_FILE = 'setup_status.txt';
const SETUP_SCRIPT = './setup_gala_node.sh';

// Utility to check file existence
const fileExists = (path) => {
    return new Promise((resolve) => {
        fs.access(path, fs.constants.F_OK, (err) => {
            resolve(!err);
        });
    });
};

// Function to run shell commands
const runCommand = (command) => {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(stderr || error.message);
            } else {
                resolve(stdout);
            }
        });
    });
};

// Define the request handler
const requestHandler = async (req, res) => {
    // Log the request details
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

    if (req.method === 'GET' && req.url === '/status') {
        try {
            if (!(await fileExists(API_KEY_FILE))) {
                // API key not set
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'error', message: 'gala-node-status: not configured' }));
                return;
            }

            if (!(await fileExists(SETUP_STATUS_FILE))) {
                // Setup not complete
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'error', message: 'gala-node-status: not ready' }));
                return;
            }

            // Run the Gala Node status command
            const status = await runCommand('sudo gala-node status');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', details: status }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', details: error }));
        }
    } else if (req.method === 'POST' && req.url === '/configure') {
        let body = '';

        req.on('data', (chunk) => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                if (!data.api_key) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'error', message: 'API key not provided.' }));
                    return;
                }

                const apiKey = data.api_key;

                // Save API key to file
                fs.writeFileSync(API_KEY_FILE, apiKey, 'utf8');

                // Run setup script with the API key
                await runCommand(`${SETUP_SCRIPT} ${apiKey}`);

                // Indicate setup is complete
                fs.writeFileSync(SETUP_STATUS_FILE, 'setup_complete', 'utf8');

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'success', message: 'Gala Node configured and started.' }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'error', details: error }));
            }
        });
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
