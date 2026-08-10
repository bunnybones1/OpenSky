module.exports = class BuyCard {
  async command(grade, card) {
    await this.api
      .clearCart()
      .applyCardFilter(grade)
      .moveToElement(`*[data-card-id="${card}"]`, 50, 50)
      .waitForElementVisible(`*[data-card-id="${card}"] *[data-add-card-id]`, 120000)
      .pause(1000)
      .click(`*[data-card-id="${card}"] *[data-add-card-id]`);

    const beforeBuyCount = (await this.api.getText(`*[data-card-id="${card}"] *[data-id="cardStock"]`));

    await this.api
      .waitForElementVisible('*[data-id="reviewOrder"]:enabled')
      .click('*[data-id="reviewOrder"]:enabled')
      .assert.elementPresent(`*[data-card-row-id="${card}"]`)
      .assert.attributeEquals(`*[data-card-row-id="${card}"]`, 'data-card-row-grade', grade)
      .click('*[data-id="processOrder"]:enabled')
      .focusSequence()
      .sequenceConfirm()
      .focusOpenSky()
      .waitForElementNotPresent('*[data-id="processOrder"]', 120000);

    return beforeBuyCount;
  }
};
