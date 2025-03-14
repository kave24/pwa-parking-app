import os
import cgi
import uuid
from http.server import HTTPServer, SimpleHTTPRequestHandler
import json

# Configuration
HOST = "0.0.0.0"
PORT = 8000
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DIR = os.path.join(ROOT_DIR, "public")
UPLOADS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")

# Ensure directories exist
os.makedirs(PUBLIC_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)

class Server(SimpleHTTPRequestHandler):
    """Simple HTTP server that handles static files and photo uploads"""
    
    def __init__(self, *args, **kwargs):
        self.directory = PUBLIC_DIR
        super().__init__(*args, **kwargs)
    
    def do_POST(self):
        """Handle POST requests - file uploads only"""
        if self.path == '/api/upload':
            self.handle_file_upload()
        else:
            self.send_error(404, "Endpoint not found")
            
    def handle_file_upload(self):
        """Handle photo uploads"""
        try:
            # Parse the form data
            form = cgi.FieldStorage(
                fp=self.rfile,
                headers=self.headers,
                environ={
                    'REQUEST_METHOD': 'POST',
                    'CONTENT_TYPE': self.headers.get('Content-Type')
                }
            )
            
            # Check if the file is present
            if 'photo' not in form:
                self.send_json({'error': 'No file uploaded'}, 400)
                return
                
            # Get the file item
            file_item = form['photo']
            
            # Check if it's actually a file
            if not file_item.filename:
                self.send_json({'error': 'No file selected'}, 400)
                return
                
            # Generate a unique filename to prevent overwriting
            file_ext = os.path.splitext(file_item.filename)[1]
            new_filename = f"{uuid.uuid4()}{file_ext}"
            file_path = os.path.join(UPLOADS_DIR, new_filename)
            
            # Save the file
            with open(file_path, 'wb') as f:
                f.write(file_item.file.read())
            
            # Send the simplest OK response
            self.send_json({'status': 'OK'})
            
        except Exception as e:
            self.send_json({'error': str(e)}, 500)
    
    def send_json(self, data, status=200):
        """Send a JSON response"""
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))


def run_server():
    """Start the HTTP server"""
    server = HTTPServer((HOST, PORT), Server)
    print(f"Server running at http://{HOST}:{PORT}/")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        server.server_close()

if __name__ == "__main__":
    run_server()