const tls = require('tls');
const events = require('events');

// const keyPath = `../certs/client.key`;
// const certPath = `../certs/client.crt`;
// const caPath = `../certs/ca.pem`;


class TlsClient extends events {
  constructor(props = {}) {
    if (!props.ca || !props.key || !props.cert) throw new Error('ca, key and cert is required');
    super();
    this._eol = '\n';
    this._taskIdField = props.taskIdField || '_taskId';
    this.host = props.host || '127.0.0.1';
    this.port = props.port || 80;
    this._dataField = 'payload';
    this._eventKey = 'taskId';
    this.ca = props.ca;
    this.key = props.key;
    this.cert = props.cert;
    this._taskId = 0;
    this._taskIdLimit = 65536;

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
    // this.socket.on('secureConnect', () => {console.log('successfully connected')});
    this.socket.on('data', this._parseDataFromServer.bind(this));
    // this.socket.on('error', err => console.error('Error on client', err));
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
        this._deleteTaskIdFromObj(obj);
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
      [this._dataField]: data
    };
    let {message, taskId} = this._formatDataToSend(obj);
    this.socket.write(message);
    const result = await this._createTaskListener(taskId);
    return result;
  }

  _formatDataToSend(data) {
    let objToSend = data || {};
    const taskId = this._getNewTaskId();
    objToSend[this._taskIdField] = taskId;
    return {message: `${JSON.stringify(objToSend)}${this._eol}`, taskId};
  }
  _getNewTaskId() {
    return ++this._taskId % this._taskIdLimit;
  }
  _getTaskIdFromObj(obj) {
    if (!obj) throw new Error('Obj is required');
    return obj[this._taskIdField];
  }
  async _createTaskListener(taskId) {
    return await Promise.race([
      new Promise(res => {
        this.tasksSet.add(taskId);
        this.once(`${this._eventKey}:${taskId}`, res)
      }),
      this._delay(20 * 1000, true)
    ])
  }

  _emitTaskComplete(taskId, result) {
    this.tasksSet.delete(taskId);
    this.emit(`${this._eventKey}:${taskId}`, result);
  }

  async _delay(ms, throwTimeoutError, timeoutMessage = 'My timeout error') {
    return await new Promise((res, rej) =>
      (throwTimeoutError) ? setTimeout(rej, ms, timeoutMessage) : setTimeout(res, ms)
    );
  }

  _deleteTaskIdFromObj(obj) {
    if (!obj || typeof obj !== 'object') return;
    delete obj[this._taskIdField];
  }

  async sendData(data) {
    // console.log('data', data);
    if (!data || typeof data !== 'object') throw new Error('Data is required');
    return await this._sendDataMessage(data);
  }
}

module.exports = TlsClient;
