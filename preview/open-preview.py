"""Local-only static editor. Python 3 standard library; no packages or classroom server."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os
import threading
import webbrowser
import urllib.parse
ROOT = Path(__file__).resolve().parent
PORT = 8765
HOST = "127.0.0.1"
URL = f"http://{HOST}:{PORT}/editor-preview.html"
class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def do_GET(self):
        if self.headers.get("Host") not in (f"{HOST}:{PORT}", f"localhost:{PORT}"):
            self.send_error(403)
            return
        path = urllib.parse.urlsplit(self.path).path
        if path == "/":
            self.send_response(302)
            self.send_header("Location", "/editor-preview.html")
            self.end_headers()
            return
        if path != "/editor-preview.html" and not path.startswith(("/assets/", "/atlas/")):
            self.send_error(404)
            return
        target = Path(self.translate_path(path)).resolve()
        allowed = target == ROOT / "editor-preview.html" or any((ROOT / folder) in target.parents for folder in ("assets", "atlas"))
        if not allowed or not target.is_file():
            self.send_error(404)
            return
        super().do_GET()
    def do_HEAD(self):
        self.send_error(405)
    def end_headers(self):
        self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()
    def list_directory(self, path):
        self.send_error(404)
try:
    server = ThreadingHTTPServer((HOST, PORT), Handler)
except OSError as exc:
    raise SystemExit(f"Cannot open the fixed preview port {PORT}: {exc}. Close the other preview first.")
print(f"Gut & Mind local editor: {URL}\nKeep this window open. Press Ctrl+C to stop.", flush=True)
if os.environ.get("GM_NO_BROWSER") != "1":
    threading.Timer(0.5, lambda: webbrowser.open(URL)).start()
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
