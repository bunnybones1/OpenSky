module.exports = class ApplyCardFilter {
  async command(grade, prism) {
    const key = `SW_${grade}_CARDS`.toUpperCase();

    await this.api
      .click('*[data-id="cardFilter"]')
      .waitForElementVisible(`*[data-key="${key}"]`)
      .pause(2000)
      .click(`*[data-key="${key}"]`);

    if (prism) {
      await this.api
        .click(`*[data-key="${prism}"]`);
    }

    await this.api
      .click('.filterpanel_underlay');
  }
};
