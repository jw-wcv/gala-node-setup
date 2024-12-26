from http.server import BaseHTTPRequestHandler, HTTPServer
import subprocess
import json
import os

API_KEY_FILE = "api_key.txt"

class StatusHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        command = "sudo gala-node status"
        try:
            result = subprocess.run(command, shell=True, capture_output=True, text=True, check=True)
            status = result.stdout
            response = {"status": "success", "details": status}
        except subprocess.CalledProcessError as e:
            response = {"status": "error", "details": e.stderr}

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(response).encode("utf-8"))

    def do_POST(self):
        content_length = int(self.headers["Content-Length"])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)

        if "api_key" in data:
            api_key = data["api_key"]
            with open(API_KEY_FILE, "w") as f:
                f.write(api_key)
            response = {"status": "success", "message": "API key saved."}
        else:
            response = {"status": "error", "message": "API key not provided."}

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(response).encode("utf-8"))

def run_server():
    server_address = ("0.0.0.0", 8080)
    httpd = HTTPServer(server_address, StatusHandler)
    print("Status server running on port 8080...")
    httpd.serve_forever()

if __name__ == "__main__":
    run_server()
