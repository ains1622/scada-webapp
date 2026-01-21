
import socket
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.bind(('', 5000))
print('Escuchando en puerto 5000...')
while True:
    data, addr = s.recvfrom(1024)
    print(f'Recibido de {addr}: {data.decode()}')
