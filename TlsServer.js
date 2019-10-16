const tls = require('tls');

class TlsServer extends tls.Server {
  constructor(...props) {
    super(...props);
    this._eol = '\n';
    this._taskIdField = props.taskIdField ||  '_taskId';
    this._methodField = 'method';
    this._dataField = 'payload';
    this._methodParamsField = 'data';
    this._routeMap = new Map();
    this.on('secureConnection', (socket) => {
      // console.log('connected');
      this.listeningFunc(socket);
    })
    // this.on('error', err => console.error('Error on server', err));
  }
  listeningFunc(socket) {
    socket.on('data', (data) => this._parseDataFromClient(socket, data));
  }

  async _parseDataFromClient(socket, buff) {
    let str = buff.toString();
    let obj = {};
    let jsons = str.split(this._eol);
    for (let i = 0; i < jsons.length; i++) {
      try {
        let json = jsons[i];
        if (!json) continue;
        obj = JSON.parse(json);
        if (!obj[this._taskIdField]) return this._badRequest(socket);
        const taskId = this._getTaskIdFromObj(obj);
        if (!obj[this._dataField]) return this._badRequest(socket, taskId, `${this._dataField} is required`);
        const payload = obj[this._dataField];
        const routePath = payload[this._methodField];
        let routeFunc = this._routeMap.get(routePath);
        if (!routeFunc) return this._badRequest(socket, taskId, `Not found "${routePath}" in routes`);
        let data = payload[this._methodParamsField];
        let result = await routeFunc(data);
        this._sendDataMessage(socket, taskId, result);
      } catch (e) {
        this._sendErrorMessage(socket, this._getTaskIdFromObj(obj), e);
      }
    }
  }

  _getTaskIdFromObj(obj) {
    if (!obj || typeof obj !== 'object') throw new Error('Obj must be and object');
    return obj[this._taskIdField];
  }


  _badRequest(socket, taskId, text = 'badRequest') {
    this._sendErrorMessage(socket, taskId, text);
  }

  _sendDataMessage(socket, taskId, text = 'success') {
    let obj = {
      data: text
    };
    let message = this._formatDataToSend(taskId, obj);
    socket.write(message);
  }

  _sendErrorMessage(socket, taskId, text = 'unknown error') {
    console.log('error', text);
    if (text.message) text = text.message;
    let obj = {
      error: text
    };
    let message = this._formatDataToSend(taskId, obj);
    socket.write(message);
  }

  _formatDataToSend(taskId, data) {
    let objToSend = data || {};
    if (Number.isInteger(taskId)) objToSend._taskId = taskId;
    return `${JSON.stringify(objToSend)}${this._eol}`;
  }

  addRoute(route, func) {
    if (this._routeMap.has(route)) throw new Error(`Server already have route "${route}"`);
    this._routeMap.set(route, func);
  }

  deleteRoute(route) {
    if (!route) throw new Error('Route is required');
    return this._routeMap.delete(route);
  }
}

module.exports = TlsServer;
