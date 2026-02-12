import http.server
import ssl
import socket

hostname = socket.gethostname()
local_ip = socket.gethostbyname(hostname)
port = 8443

print(f"Lancement sur : https://{local_ip}:{port}")

server_address = ('0.0.0.0', port)
httpd = http.server.HTTPServer(server_address, http.server.SimpleHTTPRequestHandler)

ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ctx.load_cert_chain(certfile='cert.pem', keyfile='key.pem')
httpd.socket = ctx.wrap_socket(httpd.socket, server_side=True)

httpd.serve_forever()