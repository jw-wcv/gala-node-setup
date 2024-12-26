#!/bin/bash

set -e  # Exit on any error

echo "Installing prerequisites..."
sudo apt update && sudo apt install -y git python3 python3-pip

echo "Cloning the setup repository..."
git clone https://github.com/jw-wcv/gala-node-setup.git
cd gala-node-setup

echo "Running the Gala Node setup script..."
chmod +x setup_gala_node.sh
./setup_gala_node.sh <Your-API-Key>  # Replace <Your-API-Key> with the actual key

echo "Installing Python dependencies for the status server..."
pip3 install -r requirements.txt

echo "Setting up the HTTP status server as a systemd service..."
sudo cp gala_status_server.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable gala_status_server
sudo systemctl start gala_status_server

echo "Setup complete. HTTP status server is running on port 8080."
