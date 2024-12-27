#!/bin/bash

# Ensure the script is being run as root
if [ "$(id -u)" -ne 0 ]; then
  echo "This script must be run as root. Use sudo." >&2
  exit 1
fi

# Update package lists
apt update -y

# Install prerequisites
apt install -y curl gnupg apt-transport-https python3 python3-pip

# Add Node.js repository
curl -fsSL https://deb.nodesource.com/setup_current.x | bash -

# Install Node.js
apt install -y nodejs

# Install PM2 globally using npm
npm install -g pm2

# Verify Node.js installation
node_version=$(node -v)
npm_version=$(npm -v)

if [ -z "$node_version" ] || [ -z "$npm_version" ]; then
  echo "Node.js installation failed. Please check the logs." >&2
  exit 1
fi

# Verify Python installation
python_version=$(python3 --version)
pip_version=$(pip3 --version)

if [ -z "$python_version" ] || [ -z "$pip_version" ]; then
  echo "Python3 or pip3 installation failed. Please check the logs." >&2
  exit 1
fi

# Output versions
echo "Node.js version: $node_version"
echo "npm version: $npm_version"
echo "Python version: $python_version"
echo "pip version: $pip_version"

# Start the Node.js server using PM2
echo "Starting the Node.js server using PM2..."
pm2 start server.js --name gala-node-server

echo "Configuring PM2 to restart the server on system reboot..."
pm2 startup
pm2 save

echo "Setup complete. The Node.js server is running and managed by PM2."

# End of bootstrap script
