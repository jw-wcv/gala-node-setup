from http.server import BaseHTTPRequestHandler, HTTPServer
import subprocess
import json

class StatusHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Command to fetch Gala Node status
        command = "sudo gala-node status"
        try:
            # Run the command and capture the output
            result = subprocess.run(command, shell=True, capture_output=True, text=True, check=True)
            status = result.stdout
            response = {"status": "success", "details": status}
        except subprocess.CalledProcessError as e:
            response = {"status": "error", "details": e.stderr}

        # Send HTTP response
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(response).encode("utf-8"))

def run_server():
    server_address = ("0.0.0.0", 8080)  # Bind to all interfaces on port 8080
    httpd = HTTPServer(server_address, StatusHandler)
    print("Status server running on port 8080...")
    httpd.serve_forever()

if __name__ == "__main__":
    run_server()
