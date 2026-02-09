import http.server
import ssl
import socket

hostname = socket.gethostname()
local_ip = socket.gethostbyname(hostname)

port = 8443
httpd = http.server.HTTPServer(('0.0.0.0', port), http.server.SimpleHTTPRequestHandler)

ssl_enabled = False
try:
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(certfile='./cert.pem', keyfile='./key.pem')
    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
    ssl_enabled = True
except Exception as e:
    print('⚠️ Erreur en configurant SSL :', e)
    print("Le serveur démarrera en HTTP non chiffré pour debug. Assurez-vous que 'cert.pem' et 'key.pem' existent et sont valides pour activer HTTPS.")

if ssl_enabled:
    print(f"Serveur sécurisé lancé sur : https://{local_ip}:{port}")
else:
    print(f"Serveur HTTP (non sécurisé) lancé sur : http://{local_ip}:{port}")

httpd.serve_forever()