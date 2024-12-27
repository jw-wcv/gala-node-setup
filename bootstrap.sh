#!/bin/bash

set -e  # Exit on any error

echo "Installing prerequisites..."
sudo apt update && sudo apt install -y git python3 python3-pip curl

echo "Installing Node.js and npm..."
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs

echo "Installing PM2 (Process Manager for Node.js)..."
sudo npm install -g pm2

echo "Cloning the setup repository..."
git clone https://github.com/jw-wcv/gala-node-setup.git
cd gala-node-setup

echo "Starting the Node.js server using PM2..."
pm2 start server.js --name gala-node-server

echo "Configuring PM2 to restart the server on system reboot..."
pm2 startup
pm2 save

echo "Setup complete. The Node.js server is running and managed by PM2."
