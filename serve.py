# serve_spa.py
from http.server import SimpleHTTPRequestHandler, HTTPServer
import os


class SPARequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory='dist', **kwargs)

    def do_GET(self):
        if not os.path.exists(self.translate_path(self.path)) and not self.path.startswith('/assets'):
            self.path = '/index.html'
        return super().do_GET()


if __name__ == '__main__':
    PORT = 7272
    with HTTPServer(("", PORT), SPARequestHandler) as httpd:
        print(f"Serving on port {PORT}")
        httpd.serve_forever()
