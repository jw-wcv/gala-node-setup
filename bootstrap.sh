#!/bin/bash

echo "Installing Git..."
sudo apt update && sudo apt install git -y

echo "Cloning the setup repository..."
git clone https://github.com/yourusername/gala-node-setup.git
cd gala-node-setup

echo "Running the Gala Node setup script..."
chmod +x setup_gala_node.sh
./setup_gala_node.sh

echo "Starting the HTTP status server..."
nohup python3 status_server.py &

echo "Setup complete. HTTP status server is running on port 8080."
