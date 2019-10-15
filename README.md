# tlsClientServer
Node js TLS Server and Client
```$xslt
const {TlsServer, TlsClient} = require('tlsclientserver');
const fs = require('fs');

const serverOptions = {
  key: fs.readFileSync('./certs/server1.key'),
  cert: fs.readFileSync('./certs/server1.crt'),
  ca: fs.readFileSync('./certs/ca.pem'),
  requestCert: true,
  rejectUnauthorized: true
};
let tlsServer = new TlsServer(serverOptions);
tlsServer.listen(8000, () => {console.log('bound')});


const keyPath = `./certs/client.key`;
const certPath = `./certs/client.crt`;
const caPath = `./certs/ca.pem`;
let clientOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
  ca: fs.readFileSync(caPath),
  port: 8000,
  host: '127.0.0.1'
}
let tlsClient = new TlsClient(clientOptions);
tlsClient.sendData({hello: 'bla'});

```
