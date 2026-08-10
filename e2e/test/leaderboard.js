describe.skip('Leaderboard', function() {
  beforeEach(async(browser) => {
    await browser.openskyLogin();
  });

  // TODO: Test is usless atm, need to populate leaderboard on dev env
  // https://github.com/horizon-games/issue-tracker/issues/5487
  test('Player Search', async function(browser) {
    const playerName = 'Nikki1';
    await browser
      .openskyGoTo('/leaderboard')
      .waitForElementVisible('*[data-id="playerNameFilter"]')
      .updateValue('*[data-id="playerNameFilter"] input', playerName)
      .click('*[data-id="inputSubmitButton"]')
      .end();
  });
});
