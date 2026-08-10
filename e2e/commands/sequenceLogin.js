/* global crypto */
module.exports = class SequenceLogin {
  async command(index) {
    index = index || 0;

    const dump = this.api.globals.SEQUENCE_ACCOUNTS[index].dump;
    const sessionKey = this.api.globals.SEQUENCE_ACCOUNTS[index].session_key;
    const key = this.api.globals.SEQUENCE_ACCOUNTS[index].key;

    await this.api.url(this.api.globals.SEQUENCE_LOGIN)
      .waitForElementVisible('body');

    if (this.api.options.desiredCapabilities.browserName.indexOf('firefox') !== -1) {
      // Something in firefox takes about 10 seconds to happen, this is my bandaid
      await this.api
        .pause(10000);
    }

    await this.setLocalStorage('@sequence.session.dump', dump);
    await this.setLocalStorage('@sequence.acceptedTOS', '"true"');

    await this.setKey(key);
    await this.setSessionKey(sessionKey);

    await this.api.url(await this.api.sequenceUrl('/'));

    await this.api
      .waitForElementVisible('*[data-id="dismissSessions"], *[data-id="continueWelcome"], *[data-id="termsAgree"]');

    for (let ii = 0; ii < 10; ii++) {
      const termsVisible = await this.api.pause(500).isVisible({
        selector: '*[data-id="termsAgree"]',
        timeout: 5000,
        suppressNotFoundErrors: true
      });

      if (termsVisible === true) {
        await this.api.click('*[data-id="termsAgree"]').waitForElementNotPresent('*[data-id="termsAgree"]');
      }

      const sessionsVisible = await this.api.pause(500).isVisible({
        selector: '*[data-id="dismissSessions"]',
        timeout: 5000,
        suppressNotFoundErrors: true
      });

      if (sessionsVisible === true) {
        await this.api.click('*[data-id="dismissSessions"]').waitForElementNotPresent('*[data-id="dismissSessions"]');
      }

      const welcomeVisible = await this.api.pause(500).isVisible({
        selector: '*[data-id="continueWelcome"]',
        timeout: 5000,
        suppressNotFoundErrors: true
      });

      if (welcomeVisible === true) {
        await this.api.click('*[data-id="continueWelcome"]').waitForElementNotPresent('*[data-id="continueWelcome"]');
      }

      const present = await this.api.isVisible({
        selector: '*[data-id="dismissSessions"], *[data-id="continueWelcome"], *[data-id="termsAgree"]',
        suppressNotFoundErrors: true,
        timeout: 500
      });

      if (present !== true) {
        break;
      }
    }
    await this.api
      .waitForElementVisible('*[data-id="balance"]', 120000);
  }

  async setLocalStorage(key, value) {
    await this.api.execute((k, v) => {
      window.localStorage.setItem(k, v);
      return true;
    }, [key, value], (result) => {
      this.api.assert.ok(result);
    });
  }

  async setSessionKey(value) {
    await this.api.execute((value) => {
      value.data = new Uint8Array(value.data).buffer;
      value.salt = new Uint8Array(value.salt);
      value.iv = new Uint8Array(value.iv);

      const indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;
      if (!indexedDB) return Promise.reject(new Error('IndexedDB not available'));
      return new Promise(function(resolve, reject) {
        const open = indexedDB.open('@sequence', 1);

        open.onerror = function() {
          reject(open.error);
        };

        open.onupgradeneeded = function() {
          open.result.createObjectStore('security');
        };

        open.onsuccess = function() {
          const db = open.result;
          const tx = db.transaction('security', 'readwrite');
          const store = tx.objectStore('security');
          const putKey = store.put(value, 'sessionKey');

          putKey.onsuccess = function() {
            resolve(putKey.result);
          };

          tx.onerror = function() {
            reject(tx.error);
          };

          tx.oncomplete = function() {
            db.close();
          };
        };
      });
    }, [value], (result) => {
      this.api.assert.ok(result);
    });
  }

  async setKey(value) {
    await this.api.execute((value) => {
      const indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;
      if (!indexedDB) return Promise.reject(new Error('IndexedDB not available'));

      crypto.subtle.importKey(
        'jwk',
        value,
        'AES-GCM',
        false,
        ['encrypt', 'decrypt']
      ).then((k) => {
        return new Promise(function(resolve, reject) {
          const open = indexedDB.open('@sequence', 1);

          open.onerror = function() {
            reject(open.error);
          };

          open.onupgradeneeded = function() {
            open.result.createObjectStore('security');
          };

          open.onsuccess = function() {
            const db = open.result;
            const tx = db.transaction('security', 'readwrite');
            const store = tx.objectStore('security');
            const putKey = store.put(k, 'key');

            putKey.onsuccess = function() {
              resolve(putKey.result);
            };

            tx.onerror = function() {
              reject(tx.error);
            };

            tx.oncomplete = function() {
              db.close();
            };
          };
        });
      });
      return true;
    }, [value], (result) => {
      this.api.assert.ok(result);
    });
  }
};
