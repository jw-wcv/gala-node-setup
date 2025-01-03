const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Constants
const API_KEY_FILE = 'api_key.txt';
const SETUP_STATUS_FILE = 'setup_status.txt';
const SETUP_SCRIPT = './setup_gala_node.sh';
const PUBLIC_DIR = path.join(__dirname, 'public');

// Utility to check file existence
const fileExists = (path) => {
    return new Promise((resolve) => {
        fs.access(path, fs.constants.F_OK, (err) => {
            resolve(!err);
        });
    });
};

const runCommand = (command) => {
    return new Promise((resolve, reject) => {
        let output = '';
        const process = exec(command);

        // Capture real-time stdout
        process.stdout.on('data', (data) => {
            console.log(`[stdout]: ${data}`);
            output += data; // Append to the output
        });

        // Capture real-time stderr
        process.stderr.on('data', (data) => {
            console.error(`[stderr]: ${data}`);
        });

        process.on('close', (code) => {
            if (code === 0) {
                resolve(output); // Return the captured output
            } else {
                reject(`Command failed with exit code ${code}`);
            }
        });

        process.on('error', (error) => {
            reject(`Command execution failed: ${error.message}`);
        });
    });
};

// Define a function to set CORS headers
const setCORSHeaders = (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow requests from any origin
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS'); // Allow specific HTTP methods
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); // Allow specific headers
};

// Define the request handler
const requestHandler = async (req, res) => {
    // Set CORS headers for all requests
    setCORSHeaders(res);

    // Log the request details
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

    if (req.method === 'OPTIONS') {
        // Handle preflight requests (CORS)
        res.writeHead(204); // No Content
        res.end();
        return;
    }

    if (req.method === 'GET' && req.url === '/') {
        // Serve the `node_manager.html` file for the root route
        const indexPath = path.join(PUBLIC_DIR, 'node_manager.html');
        fs.readFile(indexPath, (err, data) => {
            if (err) {
                console.error('Error serving HTML file:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            }
        });
    } else if (req.method === 'GET' && req.url === '/status') {
        console.log('Handling GET /status');
        try {
            if (!(await fileExists(API_KEY_FILE))) {
                console.error('API key file not found');
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'error', message: 'gala-node-status: not configured' }));
                return;
            }

            if (!(await fileExists(SETUP_STATUS_FILE))) {
                console.error('Setup status file not found');
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'error', message: 'gala-node-status: not ready' }));
                return;
            }

            console.log('Running Gala Node status command');
            const statusOutput = await runCommand('sudo gala-node status');
            console.log('Gala Node status command output:', statusOutput);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', details: statusOutput }));
        } catch (error) {
            console.error('Error during GET /status:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', details: error }));
        }
    } else if (req.method === 'POST' && req.url === '/configure') {
        console.log('Handling POST /configure');
        let body = '';

        req.on('data', (chunk) => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                console.log(`Received body: ${body}`);
                const data = JSON.parse(body);
                if (!data.api_key) {
                    console.error('API key not provided in the request');
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'error', message: 'API key not provided.' }));
                    return;
                }

                const apiKey = data.api_key;
                console.log(`Received API key: ${apiKey}`);

                // Save API key to file
                fs.writeFileSync(API_KEY_FILE, apiKey, 'utf8');

                // Run setup script with the API key
                console.log(`Running setup script with API key: ${SETUP_SCRIPT} ${apiKey}`);
                await runCommand(`${SETUP_SCRIPT} ${apiKey}`);

                // Indicate setup is complete
                fs.writeFileSync(SETUP_STATUS_FILE, 'setup_complete', 'utf8');

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'success', message: 'Gala Node configured and started.' }));
            } catch (error) {
                console.error('Error during POST /configure:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'error', details: error }));
            }
        });
    } else if (req.method === 'PATCH' && req.url === '/restart') {
        console.log('Handling PATCH /restart');
        try {
            console.log('Restarting server using PM2...');
            const result = await runCommand('pm2 restart gala-node-server');
            console.log('Server restarted successfully:', result);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', message: 'Server restarted successfully.' }));
        } catch (error) {
            console.error('Error during PATCH /restart:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', details: error }));
        }
    } else {
        console.log('404 Not Found:', req.method, req.url);
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
