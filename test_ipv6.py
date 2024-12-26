from http.server import HTTPServer, BaseHTTPRequestHandler

class SimpleHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"Hello, World!")

if __name__ == "__main__":
    try:
        server = HTTPServer(("::", 8080), SimpleHandler)
        print("Server running on [::]:8080")
        server.serve_forever()
    except Exception as e:
        print(f"Error: {e}")
