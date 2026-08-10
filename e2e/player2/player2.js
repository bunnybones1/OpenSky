const http = require('http');

function read(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => { body += chunk; });
    req.on('error', reject);
    req.on('end', () => resolve(JSON.parse(body)));
  });
}

async function privateGame(browser, req, res) {
  const sessionCode = await read(req);

  await browser
    .openskyGoTo('/play/private')
    .waitForElementVisible('*[data-tab-id="general.DISCOVERY"]')
    .click({
      selector: '*:not(.isSelected) > *[data-tab-id="general.DISCOVERY"]',
      suppressNotFoundErrors: true
    })
    .click('*[data-id="typeHeroButton"]')
    .waitForElementVisible('*[data-hero-id="STR"]')
    .pause(1000)
    .click('*[data-hero-id="UNKNOWN_CLASS"]')
    .assert.not.elementPresent('*[data-hero-id="STR"]')
    .updateValue('*[data-id="sessionCode"] input', sessionCode)
    .click('*[data-id="playButton"]')
    .focusSequence()
    .sequenceConfirm()
    .focusOpenSky()
    .waitForElementVisible('*[data-id="acceptMatch"]', 120000)
    .click('*[data-id="acceptMatch"]')
    .gameOpeningHand()
    .gameConcede()
    .gamePostScreenContinue()
    .gamePostScreenContinue()
    .assert.urlContains('/play');

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    data: 'Hello World!'
  }));
}

describe('Player 2', function() {
  test('Player 2', async function(browser) {
    await browser.openskyLogin(1);
    const todo = new Map();
    todo.set('/play/private', privateGame);

    const finished = new Promise((resolve, reject) => {
      try {
        const server = http.createServer();

        server.on('request', async(req, res) => {
          const handler = todo.get(req.url);
          await handler(browser, req, res);
          todo.delete(req.url);

          if (todo.size === 0) {
            await server.close();
            resolve();
          }
        });

        // server.listen('/tmp/opensky-e2e.sock');
        server.listen(9000);
      } catch (e) {
        reject(e);
      }
    });

    await finished;
    await browser.end();
  });
});
