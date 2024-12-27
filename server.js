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
    // Allow alphanumeric, dashes, and underscores only
    return input.replace(/[^a-zA-Z0-9-_]/g, '');
};

const runCommand = (command) => {
    return new Promise((resolve, reject) => {
        let output = '';
        const process = exec(command, { shell: '/bin/bash' });

        // Real-time logging of stdout
        process.stdout.on('data', (data) => {
            console.log(`[stdout]: ${data}`); // Stream to console
            output += data; // Collect output
        });

        // Real-time logging of stderr
        process.stderr.on('data', (data) => {
            console.error(`[stderr]: ${data}`); // Stream errors to console
        });

        // Process close event
        process.on('close', (code) => {
            if (code === 0) {
                console.log(`[command]: ${command} completed successfully`);
                resolve(output); // Resolve with captured output
            } else {
                console.error(`[command]: ${command} failed with exit code ${code}`);
                reject(`Command failed with exit code ${code}`);
            }
        });

        // Process error event
        process.on('error', (error) => {
            console.error(`[command]: ${command} execution failed: ${error.message}`);
            reject(`Command execution failed: ${error.message}`);
        });
    });
};



// Define the request handler
const requestHandler = async (req, res) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

    if (req.method === 'GET' && req.url === '/') {
        const indexPath = path.join(PUBLIC_DIR, 'node_manager.html'); // Use index.html instead of node_manager.html
        fs.readFile(indexPath, (err, data) => {
            if (err) {
                console.error('Error serving HTML file:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });    
    } else if (req.method === 'GET' && req.url === '/status') {
        if (!(await fileExists(API_KEY_FILE))) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', message: 'API key not configured.' }));
            return;
        }

        if (!(await fileExists(SETUP_STATUS_FILE))) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', message: 'Node not initialized.' }));
            return;
        }

        try {
            const statusOutput = await runCommand('sudo gala-node status');
            if (!statusOutput) {
                throw new Error('Status command returned empty output.');
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', details: statusOutput }));
        } catch (error) {
            console.error('Error running status command:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', message: 'Failed to get status.' }));
        }
        
    } else if (req.method === 'POST' && req.url === '/configure') {
        let body = '';
        req.on('data', (chunk) => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                const data = JSON.parse(body);

                if (!validateJsonInput(data, { api_key: 'string' })) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'error', message: 'Invalid input.' }));
                    return;
                }

                const sanitizedApiKey = sanitizeInput(data.api_key);
                fs.writeFileSync(API_KEY_FILE, sanitizedApiKey, 'utf8');

                await runCommand(`${SETUP_SCRIPT} ${sanitizedApiKey}`);
                fs.writeFileSync(SETUP_STATUS_FILE, 'setup_complete', 'utf8');

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'success', message: 'Node configured successfully.' }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'error', message: 'Failed to configure node.' }));
            }
        });
    } else if (req.method === 'PATCH' && req.url === '/restart') {
        try {
            const result = await runCommand('pm2 restart gala-node-server');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', message: 'Server restarted.' }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', message: 'Failed to restart server.' }));
        }
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
