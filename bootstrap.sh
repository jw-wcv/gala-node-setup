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

# Verify installations
node_version=$(node -v)
npm_version=$(npm -v)
python_version=$(python3 --version)
pip_version=$(pip3 --version)

if [ -z "$node_version" ] || [ -z "$npm_version" ] || [ -z "$python_version" ] || [ -z "$pip_version" ]; then
  echo "Installation failed. Please check the logs." >&2
  exit 1
fi

echo "Node.js version: $node_version"
echo "npm version: $npm_version"
echo "Python version: $python_version"
echo "pip version: $pip_version"

# Set up the systemd service
SERVICE_FILE_PATH="/etc/systemd/system/gala-node.service"

cat <<EOF > $SERVICE_FILE_PATH
[Unit]
Description=Gala Node Server
After=network.target

[Service]
ExecStart=/usr/bin/node $(pwd)/server.js
Restart=always
User=root
Environment=PATH=/usr/bin:/usr/local/bin
WorkingDirectory=$(pwd)

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd to pick up the new service
echo "Reloading systemd daemon..."
systemctl daemon-reload

# Enable and start the gala-node.service
echo "Enabling and starting the gala-node.service..."
systemctl enable gala-node.service
systemctl start gala-node.service

# Check service status
echo "Checking service status..."
if systemctl is-active --quiet gala-node.service; then
  echo "gala-node.service is active and running."
else
  echo "Failed to start gala-node.service. Please check the logs."
  journalctl -u gala-node.service
  exit 1
fi

echo "Setup complete. The Node.js server is running and managed by systemd."

# End of bootstrap script

