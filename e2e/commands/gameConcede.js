module.exports = class GameConcede {
  async command() {
    await this.api
      // TODO: Figure out how to play games. Hooks?
      .waitForElementVisible('canvas')
      .windowSize('current', 945, 1080)

      .pause(5000)
      .moveToElement('canvas', 870, 30)
      .mouseButtonClick(0)

      .pause(5000)
      .moveToElement('canvas', 440, 325)
      .mouseButtonClick(0)

      .pause(5000)
      .moveToElement('canvas', 375, 460)
      .mouseButtonClick(0);
  }
};
