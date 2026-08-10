module.exports = class GameOpeningHand {
  async command() {
    await this.api
      // TODO: Figure out how to play games. Hooks?
      .waitForElementVisible('canvas')
      .windowSize('current', 945, 1080)

      .pause(25000)
      .moveToElement('canvas', 200, 200)
      .mouseButtonClick(0)

      .moveToElement('canvas', 400, 200)
      .mouseButtonClick(0)

      .moveToElement('canvas', 550, 200)
      .mouseButtonClick(0)

      .moveToElement('canvas', 725, 200)
      .mouseButtonClick(0)

      .pause(5000)
      .moveToElement('canvas', 815, 815)
      .mouseButtonClick(0);
  }
};
