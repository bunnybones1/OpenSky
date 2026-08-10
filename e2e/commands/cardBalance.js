module.exports = class CardBalance {
  async command(grade, card) {
    await this.api.openskyGoTo(`/items/cards/${card}/${grade}`);

    return (await this.api.getText(`*[data-id="owned"][data-grade="${grade}"]`));
  }
};
