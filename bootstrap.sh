#!/bin/bash

set -e  # Exit on any error

echo "Installing prerequisites..."
sudo apt update && sudo apt install -y git python3 python3-pip

echo "Cloning the setup repository..."
git clone https://github.com/jw-wcv/gala-node-setup.git
cd gala-node-setup

echo "Setting up the HTTP status server as a systemd service..."
sudo cp gala_status_server.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable gala_status_server
sudo systemctl start gala_status_server

echo "Setup complete. HTTP status server is running on port 8080."
