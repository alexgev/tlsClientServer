const tls = require('tls');
const fs = require('fs');
const events = require('events');

// const keyPath = `../certs/client.key`;
// const certPath = `../certs/client.crt`;
// const caPath = `../certs/ca.pem`;


class TlsClient extends events {
  constructor(props = {}) {
    if (!props.ca || !props.key || !props.cert) throw new Error('ca, key and cert is required');
    super();
    this._eol = '\n';
    this.taskIdField = '_taskId';
    this.host = props.host || '127.0.0.1';
    this.port = props.port || 80;
    this.ca = props.caPath;
    this.key = props.keyPath;
    this.cert = props.certPath;
    this.taskId = 0;
    this.taskIdLimit = 65536;

    this._initConnection();
  }

  _initConnection() {
    this.tasksSet = new Set();
    // this.messagesMap = new Map();
    const options = {
      ca: this.ca,
      key: this.key,
      cert: this.cert,
      host: this.host,
      port: this.port,
      rejectUnauthorized: true,
      requestCert: true
    };
    const socket = tls.connect(options);
    this.socket = socket;
    // process.stdin.pipe(socket);
    this.socket.on('secureConnect', () => {console.log('successfully connected')});
    this.socket.on('data', this._parseDataFromServer.bind(this));
    this.socket.on('error', err => console.log('err', err));
    this.socket.on('close', async () => {
      this._flushAllTasks();
      await this._delay(5 * 1000);
      this._initConnection();
    });
  }

  _flushAllTasks() {
    for (let taskId of this.tasksSet.keys()) {
      this.tasksSet.delete(taskId);
      this._emitTaskComplete(taskId, 'Task flushed');
    }
  }

  _parseDataFromServer(buff) {
    // console.log('getCipher()', socket.getCipher());
    let str = buff.toString();
    let obj = {};
    let jsons = str.split(this._eol);
    for (let i = 0; i < jsons.length; i++) {
      let json = jsons[i];
      if (!json) continue;
      try {
        obj = JSON.parse(json);
        let taskId = this._getTaskIdFromObj(obj);
        this._emitTaskComplete(taskId, obj);
      } catch (e) {
        console.log('e', e);
        // this.sendErrorMessage(socket, this._getTaskIdFromObj(obj), e);
      }
    }
    // console.log('this', this);
  }

  async _sendDataMessage(data) {
    let obj = {
      data: data
    };
    let {message, taskId} = this._formatDataToSend(obj);
    this.socket.write(message);
    const result = await this._createTaskListener(taskId);
    return result;
  }

  _formatDataToSend(data) {
    let objToSend = data || {};
    const taskId = this.getNewTaskId();
    objToSend[this.taskIdField] = taskId;
    return {message: `${JSON.stringify(objToSend)}${this._eol}`, taskId};
  }
  getNewTaskId() {
    return ++this.taskId % this.taskIdLimit;
  }
  _getTaskIdFromObj(obj) {
    if (!obj) throw new Error('Obj is required');
    return obj[this.taskIdField];
  }
  async _createTaskListener(taskId) {
    return await Promise.race([
      new Promise(res => {
        this.tasksSet.add(taskId);
        this.once(`taskId:${taskId}`, res)
      }),
      this._delay(20 * 1000, true)
    ])
  }

  _emitTaskComplete(taskId, result) {
    console.log(`success taskId with result ${taskId}`, result);
    this.tasksSet.delete(taskId);
    this.emit(`taskId:${taskId}`, result);
  }

  async _delay(ms, throwTimeoutError, timeoutMessage = 'My timeout error') {
    return await new Promise((res, rej) =>
      (throwTimeoutError) ? setTimeout(rej, ms, timeoutMessage) : setTimeout(res, ms)
    );
  }

  async sendData(data) {
    // console.log('data', data);
    if (!data || typeof data !== 'object') throw new Error('Data is required');
    return await this._sendDataMessage(data);
  }
}

// const tlsClient = new TlsClient({host: '127.0.0.1', port: 8000, keyPath, certPath, caPath});
//
// ;(async () => {
//   // for (let i = 0; i < 100000; i++) {
//   //   tlsClient.sendData({hello: 'bla'});
//   // }
//    await tlsClient.sendData({hello: 'bla'});
// })();

module.exports = TlsClient;
