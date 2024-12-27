const express = require('express');
const path = require('path');

const app = express();
const port = 1337;

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint for server status
app.get('/api/status', (req, res) => {
    res.json({
        servers: [
            { name: 'Backend Server', status: 'Running' },
            { name: 'Frontend Server', status: 'Running' },
        ],
    });
});

// Default route for React
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'node_manager.html'));
});

app.listen(port, () => {
    console.log(`Frontend server listening at http://localhost:${port}`);
});
