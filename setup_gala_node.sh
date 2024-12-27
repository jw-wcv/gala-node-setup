#!/bin/bash

set -e  # Exit on any error

# Function to log messages with timestamps
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_message "Updating system packages..."
sudo NEEDRESTARTMODE=a apt update && sudo apt upgrade -y

log_message "Installing Docker..."
sudo apt install -y docker.io
sudo systemctl enable --now docker

log_message "Checking Docker status..."
if ! sudo systemctl is-active --quiet docker; then
    log_message "Docker failed to start."
    exit 1
fi

log_message "Downloading Gala Node software..."
sudo wget --trust-server-names https://links.gala.com/DownloadLinuxNode

log_message "Extracting Gala Node software..."
sudo tar xzvf gala-node-v*.tar.gz || { log_message "Failed to extract Gala Node software."; exit 1; }

log_message "Installing Gala Node software..."
# Auto-accept the EULA using a here-document
sudo gala-node/install.sh << EOF
Y
EOF

log_message "Configuring Gala Node with the provided API key..."
if [ -z "$1" ]; then
    log_message "API key not provided. Exiting."
    exit 1
fi
sudo gala-node config api-key "$1" || { log_message "Failed to configure API key."; exit 1; }

log_message "Listing available workloads..."
sudo gala-node licenses || { log_message "Failed to list available workloads."; exit 1; }

log_message "Adding 'founders' workload..."
sudo gala-node workload add founders || { log_message "Failed to add 'founders' workload."; exit 1; }

log_message "Starting Gala Node..."
sudo gala-node start || { log_message "Failed to start Gala Node."; exit 1; }

log_message "Setup completed! Checking status..."
sudo gala-node status || { log_message "Failed to retrieve Gala Node status."; exit 1; }

log_message "Gala Node setup successfully completed."
