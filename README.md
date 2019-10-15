# tlsClientServer
Node js TLS Server and Client
```javascript
const fs = require('fs');
const port = process.env.PORT || 8000;

const serverOptions = {
  key: fs.readFileSync('./examplesCerts/server.key'),
  cert: fs.readFileSync('./examplesCerts/server.crt'),
  ca: fs.readFileSync('./examplesCerts/ca.pem'),
  requestCert: true,
  rejectUnauthorized: true
};
let tlsServer = new TlsServer(serverOptions);
tlsServer.listen(port, () => {console.log('bound')});


const keyPath = `./examplesCerts/client.key`;
const certPath = `./examplesCerts/client.crt`;
const caPath = `./examplesCerts/ca.pem`;
let clientOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
  ca: fs.readFileSync(caPath),
  port: port,
  host: '127.0.0.1'
}
let tlsClient = new TlsClient(clientOptions);

tlsServer.addRoute('testRoute', () => {return 3+3});
tlsClient.sendData({method: 'testRoute'});

```
