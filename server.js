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

const sanitizeInput = (input) => {
    return input.replace(/[^a-zA-Z0-9+/=]/g, ''); // Allow alphanumeric, +, /, and =
};


// Function to run shell commands
const runCommand = (command) => {
    return new Promise((resolve, reject) => {
        console.log(`[DEBUG] Executing command: ${command}`); // Log the command
        let output = '';
        const process = exec(command, { shell: '/bin/bash' });

        process.stdout.on('data', (data) => {
            console.log(`[DEBUG][stdout]: ${data}`); // Log stdout
            output += data;
        });

        process.stderr.on('data', (data) => {
            console.error(`[DEBUG][stderr]: ${data}`); // Log stderr
        });

        process.on('close', (code) => {
            if (code === 0) {
                console.log(`[DEBUG] Command succeeded: ${command}`);
                resolve(output.trim()); // Return the trimmed output
            } else {
                console.error(`[DEBUG] Command failed with exit code ${code}`);
                reject(`Command failed with exit code ${code}`);
            }
        });

        process.on('error', (error) => {
            console.error(`[DEBUG] Command execution error: ${error.message}`);
            reject(`Command execution error: ${error.message}`);
        });
    });
};


// Define the request handler
const requestHandler = async (req, res) => {
    console.log(`[DEBUG][${new Date().toISOString()}] ${req.method} ${req.url}`);

    if (req.method === 'GET' && req.url === '/') {
        const indexPath = path.join(PUBLIC_DIR, 'node_manager.html'); // Serve the manager page
        fs.readFile(indexPath, (err, data) => {
            if (err) {
                console.error('[DEBUG] Error serving HTML file:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
    } else if (req.method === 'GET' && req.url === '/status') {
        console.log('[DEBUG] Handling GET /status');
        if (!(await fileExists(API_KEY_FILE))) {
            console.error('[DEBUG] API key file not found');
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', message: 'API key not configured.' }));
            return;
        }

        if (!(await fileExists(SETUP_STATUS_FILE))) {
            console.error('[DEBUG] Setup status file not found');
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', message: 'Node not initialized.' }));
            return;
        }

        try {
            console.log('[DEBUG] Running Gala Node status command');
            const statusOutput = await runCommand('sudo gala-node status');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', details: statusOutput }));
        } catch (error) {
            console.error('[DEBUG] Error running status command:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', message: 'Failed to get status.' }));
        }
    } else if (req.method === 'POST' && req.url === '/configure') {
        console.log('[DEBUG] Handling POST /configure');
        let body = '';

        req.on('data', (chunk) => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                console.log(`[DEBUG] Received body: ${body}`);
                const data = JSON.parse(body);

                if (!validateJsonInput(data, { api_key: 'string' })) {
                    console.error('[DEBUG] Invalid API key input');
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'error', message: 'Invalid input.' }));
                    return;
                }

                const sanitizedApiKey = sanitizeInput(data.api_key);
                console.log(`[DEBUG] Sanitized API key: ${sanitizedApiKey}`);

                // Save API key to file
                console.log(`[DEBUG] Writing API key to file: ${API_KEY_FILE}`);
                fs.writeFileSync(API_KEY_FILE, sanitizedApiKey, 'utf8');

                // Run setup script
                console.log(`[DEBUG] Running setup script with API key: ${SETUP_SCRIPT} ${sanitizedApiKey}`);
                await runCommand(`${SETUP_SCRIPT} ${sanitizedApiKey}`);

                // Indicate setup completion
                console.log(`[DEBUG] Writing setup complete status to file: ${SETUP_STATUS_FILE}`);
                fs.writeFileSync(SETUP_STATUS_FILE, 'setup_complete', 'utf8');

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'success', message: 'Node configured successfully.' }));
            } catch (error) {
                console.error('[DEBUG] Error during POST /configure:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'error', message: 'Failed to configure node.' }));
            }
        });
    } else if (req.method === 'PATCH' && req.url === '/restart') {
        console.log('[DEBUG] Handling PATCH /restart');
        try {
            const result = await runCommand('pm2 restart gala-node-server');
            console.log('[DEBUG] Server restarted successfully:', result);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', message: 'Server restarted.' }));
        } catch (error) {
            console.error('[DEBUG] Error during PATCH /restart:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', message: 'Failed to restart server.' }));
        }
    
    } else {
        console.log('[DEBUG] 404 Not Found:', req.method, req.url);
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
};

// Create and start the server
const server = http.createServer(requestHandler);

server.listen(8080, '::', () => {
    console.log('[DEBUG] Server is running on port 8080 and accessible via IPv6');
});
