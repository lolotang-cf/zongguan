'use strict';
/**
 * CloudBase 事件函数入口（HTTP 适配器）
 * 本环境 Web 函数（--httpFn）平台层不可用（FUNCTIONS_PARAM_INVALID），改用标准事件函数 + API 网关触发。
 * 这里用 Node http 在容器内桥接 Express app：把 API 网关事件转成 HTTP 请求发给 app，
 * 再把响应转回 API 网关返回格式。前端经 API 网关域名跨域调用（server 已开启 cors）。
 */
const http = require('http');
const app = require('./server/index.js');

let serverPromise = null;
function getServer() {
  if (!serverPromise) {
    serverPromise = new Promise((resolve, reject) => {
      const s = http.createServer(app);
      s.on('error', reject);
      s.listen(0, '127.0.0.1', () => resolve(s));
    });
  }
  return serverPromise;
}

exports.main = async (event, context) => {
  const server = await getServer();
  const port = server.address().port;
  const method = (event.httpMethod || 'GET').toUpperCase();
  const path = event.path || '/';
  const headers = Object.assign({}, event.headers || {});
  delete headers.host; delete headers.Host;
  delete headers['content-length']; delete headers['Content-Length'];
  const options = { host: '127.0.0.1', port, path, method, headers };
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        const ct = res.headers['content-type'] || '';
        const texty = /text|json|javascript|xml|html/.test(ct);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: texty ? buf.toString('utf8') : buf.toString('base64'),
          isBase64Encoded: !texty
        });
      });
    });
    req.on('error', reject);
    if (event.body) {
      const b = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : Buffer.from(event.body);
      req.write(b);
    }
    req.end();
  });
};
