#!/bin/bash

set -e  # Exit on any error

echo "Updating system packages..."
sudo NEEDRESTARTMODE=a apt update && sudo apt upgrade -y

echo "Installing Docker..."
sudo apt install -y docker.io
sudo systemctl enable --now docker

echo "Checking Docker status..."
sudo systemctl status docker || { echo "Docker failed to start"; exit 1; }

echo "Downloading Gala Node software..."
sudo wget --trust-server-names https://links.gala.com/DownloadLinuxNode

echo "Extracting Gala Node software..."
sudo tar xzvf gala-node-v*.tar.gz

echo "Installing Gala Node software..."
sudo gala-node/install.sh

echo "Configuring Gala Node with API key..."
sudo gala-node config api-key "$1"  # Pass the API key as a script argument

echo "Listing available workloads..."
sudo gala-node licenses

echo "Adding 'founders' workload..."
sudo gala-node workload add founders

echo "Starting Gala Node..."
sudo gala-node start

echo "Setup completed! Checking status..."
sudo gala-node status
