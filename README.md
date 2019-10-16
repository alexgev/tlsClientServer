# tlsClientServer
Node js TLS Server and Client

Certificate generation (NOT FOR PRODUCTION USE)

- Create folder
```bash
mkdir examplesCerts
cd examplesCerts
```
- Generate ca cert
```bash
openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 9999 -key ca.key -out ca.crt
cat ca.key ca.crt  > ca.pem
```
- Create config file openssl-server.cnf to generate server cert.
In the [alt_names] section, enter the appropriate DNS names and/or IP addresses
```bash
# NOT FOR PRODUCTION USE. OpenSSL configuration file for testing.
# openssl-server.cnf

[ req ]
default_bits = 4096
default_keyfile = myTestServerCertificateKey.pem    ## The default private key file name.
default_md = sha256
distinguished_name = req_dn
req_extensions = v3_req

[ v3_req ]
subjectKeyIdentifier  = hash
basicConstraints = CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment
nsComment = "OpenSSL Generated Certificate for TESTING only.  NOT FOR PRODUCTION USE."
extendedKeyUsage  = serverAuth, clientAuth
subjectAltName = @alt_names

[ alt_names ]

DNS.1 = localhost
#DNS.2 =

IP.1 = 127.0.0.1

#IP.2 =

[ req_dn ]
countryName = Country Name (2 letter code)

countryName_default = RU

countryName_min = 2
countryName_max = 2

stateOrProvinceName = State or Province Name (full name)

stateOrProvinceName_default = Moscow

stateOrProvinceName_max = 64

localityName = Locality Name (eg, city)

localityName_default = Moscow

localityName_max = 64

organizationName = Organization Name (eg, company)

organizationName_default = Organization

organizationName_max = 64

organizationalUnitName = Organizational Unit Name (eg, section)

organizationalUnitName_default = Server

organizationalUnitName_max = 64

commonName = Common Name (eg, YOUR name)
commonName_max = 64
commonName_default = Alexey
```
- Generate server cert
```bash
openssl genrsa -out server.key 4096
openssl req -new -key server.key -out server.csr -config openssl-server.cnf
openssl x509 -sha256 -req -days 9999 -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt -extfile openssl-server.cnf -extensions v3_req
cat server.crt server.key > server.pem
```
- Generate client cert
```bash
openssl genrsa -out client.key 4096
openssl req -new -key client.key -out client.csr
openssl x509 -sha256 -req -days 9999 -in client.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out client.crt -extensions v3_req
cat client.crt client.key > client.pem
```

Code example
```javascript
const {TlsServer, TlsClient} = require('tlsclientserver');
const fs = require('fs');
const port = process.env.PORT || 8000;

/**
 * @type {{rejectUnauthorized: boolean, requestCert: boolean, cert: *, key: *, ca: *}}
 */
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
tlsClient.socket.on('secureConnect', () => {console.log('successfully connected')});

;(async () => {
  /**
    * Define route on server
    */
  tlsServer.addRoute('testRoute', (props) => props.a + props.b);
  /**
   * Call method from client and get result
   */
  let result = await tlsClient.sendData({method: 'testRoute', data: {a: 12, b: 2}});
  /**
   * result = {data: 14}
   * if an error will occur result = {error: String}
   */
  console.log('result', result);
})();

```
