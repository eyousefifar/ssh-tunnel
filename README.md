# How to use


add server information into the config file

[
  {
    "ip": "server1.example.com",
    "user": "example",
    "localPort": 32454,
    "remotePort": 80
  }
]

you should generate a ssh key using ssh-keygen and then use ssh-copy-id to copy the public key to the server

then run the script using pm2
