#!/bin/bash

echo "Updating system packages..."
sudo NEEDRESTARTMODE=a apt update && sudo apt upgrade -y

echo "Installing Docker..."
sudo apt install docker.io -y
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
sudo gala-node config api-key <Your-API-Key-Here>  # Replace with actual API key

echo "Listing available workloads..."
sudo gala-node licenses

echo "Adding desired workloads..."
sudo gala-node workload add <Desired-Workload>  # Replace with actual workload name

echo "Starting Gala Node..."
sudo gala-node start

echo "Setup completed! Checking status..."
sudo gala-node status
