const URL = require('url').URL;

try {
  module.exports = JSON.parse(process.env.NIGHTWATCH_GLOBALS);
} catch (e) {
  module.exports = require('./nightwatch.globals.local.js');
}

const openskyUrl = process.env.NIGHTWATCH_SKYWEAVER_URL;

if (openskyUrl) {
  module.exports.SKYWEAVER_URL = openskyUrl;

  const original = new URL(module.exports.SKYWEAVER_LOGIN);
  const updated = new URL(openskyUrl);

  updated.username = original.username;
  updated.password = original.password;

  module.exports.SKYWEAVER_LOGIN = updated.toString();
}

if (!('asyncHookTimeout' in module.exports)) {
  module.exports.asyncHookTimeout = 100000;
}
