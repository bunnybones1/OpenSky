module.exports = class GamePostScreenContinue {
  async command() {
    await this.api
      // TODO: Figure out how to play games. Hooks?
      .waitForElementVisible('canvas')
      .windowSize('current', 945, 1080)

      .pause(5000)
      .moveToElement('canvas', 500, 790)
      .mouseButtonClick(0);
  }
};
