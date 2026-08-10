module.exports = class SequenceConfirm {
  async command(path) {
    // TODO: Use data attributes instead of searching for text
    const CONFIRM_XPATH = '//*[contains(text(), "Confirm")]/parent::*[not(contains(@class, "disabled"))]';

    await this.api
      .useXpath()
      .waitForElementVisible(CONFIRM_XPATH, 120000)
      .click(CONFIRM_XPATH)
      .useCss();
  }
};
