module.exports = class FocusOpenSky {
  async command() {
    let handles = await this.api.windowHandles();
    if (handles.length > 1) {
      const currentHandle = await this.api.windowHandle();
      handles = handles.filter(h => h !== currentHandle);
    }

    await this.api.switchWindow(handles[0]);
    await this.api.assert.titleEquals('OpenSky');
  }
};
