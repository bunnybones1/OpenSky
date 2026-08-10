module.exports = class FocusSequence {
  async command() {
    const currentHandle = await this.api.windowHandle();
    let handles = await this.api.windowHandles();

    handles = handles.filter(h => h !== currentHandle);

    await this.api.switchWindow(handles[0]);
    await this.api.assert.titleEquals('Sequence Wallet');
  }
};
