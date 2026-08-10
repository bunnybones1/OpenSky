const http = require('http');

module.exports = class TriggerPlayer2 {
  async command(path, obj) {
    const postData = JSON.stringify(obj);

    const options = {
      hostname: 'localhost',
      port: 9000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      console.log(`STATUS: ${res.statusCode}`);
    });

    req.on('error', (e) => {
      console.error(`problem with request: ${e.message}`);
    });

    // Write data to request body
    req.write(postData);
    req.end();
  }
};
