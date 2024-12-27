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
const fileExists = (filePath) => {
    return new Promise((resolve) => {
        fs.access(filePath, fs.constants.F_OK, (err) => {
            resolve(!err);
        });
    });
};

// Utility to validate JSON input
const validateJsonInput = (input, schema) => {
    const keys = Object.keys(schema);
    for (const key of keys) {
        if (!Object.prototype.hasOwnProperty.call(input, key) || typeof input[key] !== schema[key]) {
            return false;
        }
    }
    return true;
};

// Utility to sanitize input for commands
const sanitizeInput = (input) => {
    return input.replace(/[^a-zA-Z0-9-_]/g, '');
};

const runCommand = (command) => {
    return new Promise((resolve, reject) => {
        let output = '';
        const process = exec(command, { shell: '/bin/bash' });

        process.stdout.on('data', (data) => {
            console.log(`[stdout]: ${data}`);
            output += data;
        });

        process.stderr.on('data', (data) => {
            console.error(`[stderr]: ${data}`);
        });

        process.on('close', (code) => {
            if (code === 0) {
                console.log(`[command]: ${command} completed successfully with output:\n${output}`);
                resolve(output);
            } else {
                console.error(`[command]: ${command} failed with exit code ${code}`);
                reject(`Command failed with exit code ${code}`);
            }
        });

        process.on('error', (error) => {
            console.error(`[command]: ${command} execution encountered an error: ${error.message}`);
            reject(`Command execution failed: ${error.message}`);
        });
    });
};

// Define the request handler
const requestHandler = async (req, res) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

    if (req.method === 'GET' && req.url === '/status') {
        try {
            console.log('Handling GET /status');
            if (!(await fileExists(API_KEY_FILE))) {
                console.error('API key file not found');
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'error', message: 'API key not configured.' }));
                return;
            }

            if (!(await fileExists(SETUP_STATUS_FILE))) {
                console.error('Setup status file not found');
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'error', message: 'Node not initialized.' }));
                return;
            }

            const statusOutput = await runCommand('sudo gala-node status');
            console.log('Gala Node status command output:', statusOutput);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', details: statusOutput }));
        } catch (error) {
            console.error('Error during GET /status:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', message: 'Failed to get status.', details: error.toString() }));
        }
    } else if (req.method === 'POST' && req.url === '/configure') {
        console.log('Handling POST /configure');
        let body = '';

        req.on('data', (chunk) => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                if (!validateJsonInput(data, { api_key: 'string' })) {
                    console.error('Invalid input');
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'error', message: 'Invalid input.' }));
                    return;
                }

                const sanitizedApiKey = sanitizeInput(data.api_key);
                console.log(`Sanitized API key: ${sanitizedApiKey}`);

                fs.writeFileSync(API_KEY_FILE, sanitizedApiKey, 'utf8');

                await runCommand(`${SETUP_SCRIPT} ${sanitizedApiKey}`);
                fs.writeFileSync(SETUP_STATUS_FILE, 'setup_complete', 'utf8');

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'success', message: 'Node configured successfully.' }));
            } catch (error) {
                console.error('Error during POST /configure:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'error', message: 'Failed to configure node.', details: error.toString() }));
            }
        });
    } else if (req.method === 'PATCH' && req.url === '/restart') {
        console.log('Handling PATCH /restart');
        try {
            const result = await runCommand('pm2 restart gala-node-server');
            console.log('Server restarted successfully:', result);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', message: 'Server restarted successfully.' }));
        } catch (error) {
            console.error('Error during PATCH /restart:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', message: 'Failed to restart server.', details: error.toString() }));
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
