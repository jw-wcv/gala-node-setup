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

const runCommand = (command) => {
    return new Promise((resolve, reject) => {
        const process = exec(command);

        // Capture real-time stdout and stderr
        process.stdout.on('data', (data) => {
            console.log(`[stdout]: ${data}`);
        });

        process.stderr.on('data', (data) => {
            console.error(`[stderr]: ${data}`);
        });

        process.on('close', (code) => {
            if (code === 0) {
                resolve(`Command executed successfully with exit code ${code}`);
            } else {
                reject(`Command failed with exit code ${code}`);
            }
        });

        process.on('error', (error) => {
            reject(`Command execution failed: ${error.message}`);
        });
    });
};


// Define the request handler
const requestHandler = async (req, res) => {
    // Log the request details
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

    if (req.method === 'GET' && req.url === '/status') {
        try {
            console.log('Handling GET /status');
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

            // Run the Gala Node status command
            console.log('Running Gala Node status command');
            const status = await runCommand('sudo gala-node status');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', details: status }));
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
                console.log(`Writing API key to file: ${API_KEY_FILE}`);
                fs.writeFileSync(API_KEY_FILE, apiKey, 'utf8');

                // Run setup script with the API key
                console.log(`Running setup script with API key: ${SETUP_SCRIPT} ${apiKey}`);
                await runCommand(`${SETUP_SCRIPT} ${apiKey}`);

                // Indicate setup is complete
                console.log(`Writing setup complete status to file: ${SETUP_STATUS_FILE}`);
                fs.writeFileSync(SETUP_STATUS_FILE, 'setup_complete', 'utf8');

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'success', message: 'Gala Node configured and started.' }));
            } catch (error) {
                console.error('Error during POST /configure:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'error', details: error }));
            }
        });
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
