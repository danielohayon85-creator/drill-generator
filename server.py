import http.server
import os

port = int(os.environ.get('PORT', 8081))
os.chdir(os.path.dirname(os.path.abspath(__file__)))
handler = http.server.SimpleHTTPRequestHandler
httpd = http.server.HTTPServer(('', port), handler)
print(f'מחולל תרגילים פועל על פורט {port}')
print(f'פתח דפדפן בכתובת: http://localhost:{port}')
httpd.serve_forever()
