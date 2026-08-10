opensky-e2e
=============

An end-to-end test suite for OpenSky, and the Sequence wallet.

## Prerequisites
- Nodejs >= 18.7.0
- Chrome >= 108.0 [^1]

[^1]: If using a browser from a Snap package (as is default in recent Ubuntu) you'll require additional setup.

## Setup
Install dependencies:

```bash
npm install --profile=dev
```

Create configuration file `nightwatch.globals.local.js`:

```js
module.exports = {
  // Set SKYWEAVER_LOGIN_URL in your local env as: https://<user>:<password>@local.0xhorizon.net
  SKYWEAVER_LOGIN: process.env.SKYWEAVER_LOGIN_URL || 'https://local.0xhorizon.net',
  SKYWEAVER_URL: 'https://local.0xhorizon.net',

  SEQUENCE_URL: 'https://dev.sequence.app',
  // Set SEQUENCE_LOGIN_URL in your local env as: https://<user>:<password>@dev.sequence.app
  SEQUENCE_LOGIN: process.env.SEQUENCE_LOGIN_URL || 'https://dev.sequence.app',

  SEQUENCE_ACCOUNTS: [
    {
      dump: '...',

      key: { alg: 'A256GCM', ext: true, k: '...', key_ops: ['encrypt', 'decrypt'], kty: 'oct' },

      session_key: {
        data: [ ... ],
        iv: [ ... ],
        salt: [ ... ]
      }
    }
  ],

  IMAP: {
    user: 'user@example.com',
    password: '...',
    host: 'imap.example.com',
    port: 993,
    tls: true,
    authTimeout: 3000
  },

  EMAIL: 'user@example.com'
};
```

### Extracting Keys

1. Get Sequence running locally.
2. Modify Sequence's `src/utils/crypto.ts` so that every subtle operation allows export.
3. Log into your local Sequence.
4. The following should be run in the developer tools console (note that this doesn't correctly handle promises, so must be run one statement at a time):
   ```js
   //
   // Export the private key:
   //
   
   const request = window.indexedDB.open("@sequence", 3);
   let req = request.result.transaction(["security"], "readonly").objectStore("security").get("key");
   window.crypto.subtle.exportKey("jwk", req.result).then((k) => console.log(JSON.stringify(k)))
   // Copy-and-paste the key JSON into `nightwatch.globals.local.js` as described above.
   
   //
   // Export the session key:
   //
   let req1 = request.result.transaction(["security"], "readonly").objectStore("security").get("sessionKey");
   console.log(JSON.stringify({
       iv: Array.from(req1.result.iv),
       salt: Array.from(req1.result.salt),
       data: Array.from(new Uint8Array(req1.result.data))
   }));
   // Copy-and-paste the session key JSON into `nightwatch.globals.local.js` as described above.
   ```
5. Copy the `@sequence.session.dump` value from Local Storage and paste it in `nightwatch.globals.local.js` (yes, as a string.)

## Running the Tests

To run all the tests:

```bash
# Using Chrome
npx nightwatch -e chrome,chrome-p2
```

To run a single file:

```bash
# Using Chrome
npx nightwatch test/library.js  -e chrome
```

## Contributing

Running lints:

```bash
npm test
```

Automatically formatting code:

```bash
npx eslint --fix .
```
