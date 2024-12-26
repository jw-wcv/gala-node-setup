from http.server import BaseHTTPRequestHandler, HTTPServer
import subprocess
import json
import os

# Constants
API_KEY_FILE = "api_key.txt"
SETUP_STATUS_FILE = "setup_status.txt"  # Tracks the setup state
SETUP_SCRIPT = "/home/ubuntu/gala-node-setup/setup_gala_node.sh"

class StatusHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Check if the API key is set
        if not os.path.exists(API_KEY_FILE):
            # No API key provided yet
            self.send_response(500)  # Not Configured
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            response = {"status": "error", "message": "gala-node-status: not configured"}
            self.wfile.write(json.dumps(response).encode("utf-8"))
            return

        # Check if the setup is completed
        if not os.path.exists(SETUP_STATUS_FILE):
            # Setup not yet completed
            self.send_response(400)  # Not Ready
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            response = {"status": "error", "message": "gala-node-status: not ready"}
            self.wfile.write(json.dumps(response).encode("utf-8"))
            return

        # Fetch Gala Node status
        command = "sudo gala-node status"
        try:
            result = subprocess.run(command, shell=True, capture_output=True, text=True, check=True)
            status = result.stdout
            self.send_response(200)  # Ready
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            response = {"status": "success", "details": status}
            self.wfile.write(json.dumps(response).encode("utf-8"))
        except subprocess.CalledProcessError as e:
            # If Gala Node is installed but not running
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            response = {"status": "error", "details": e.stderr}
            self.wfile.write(json.dumps(response).encode("utf-8"))

    def do_POST(self):
        content_length = int(self.headers["Content-Length"])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)

        if "api_key" not in data:
            # API key not provided
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            response = {"status": "error", "message": "API key not provided."}
            self.wfile.write(json.dumps(response).encode("utf-8"))
            return

        api_key = data["api_key"]

        # Save API key to file
        with open(API_KEY_FILE, "w") as f:
            f.write(api_key)

        # Run setup script with the API key
        try:
            command = f"{SETUP_SCRIPT} {api_key}"
            subprocess.run(command, shell=True, check=True)
            
            # Indicate setup is complete
            with open(SETUP_STATUS_FILE, "w") as f:
                f.write("setup_complete")

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            response = {"status": "success", "message": "Gala Node configured and started."}
            self.wfile.write(json.dumps(response).encode("utf-8"))
        except subprocess.CalledProcessError as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            response = {"status": "error", "details": str(e)}
            self.wfile.write(json.dumps(response).encode("utf-8"))

def run_server():
    server_address = ("::", 8080)  # Bind to all IPv6 and IPv4 interface
    httpd = HTTPServer(server_address, StatusHandler)
    print("Status server running on port 8080...")
    httpd.serve_forever()

if __name__ == "__main__":
    run_server()
