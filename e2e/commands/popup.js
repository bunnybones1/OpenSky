module.exports = class Popup {
  async command(url) {
    await this.api.execute((url) => {
      const elem = document.createElement('a');
      elem.target = '_blank';
      elem.id = 'popup';
      elem.href = url;
      elem.innerText = 'popup';
      elem.style.position = 'absolute';
      elem.style.zIndex = '1000000';
      document.body.appendChild(elem);
      return true;
    }, [url], (result) => {
      this.api.assert.ok(result);
    })
      .click('#popup')
      .assert.titleEquals('OpenSky') // Make sure we're still on the original window
      .execute(() => {
        const elem = document.getElementById('popup');
        elem.parentNode.removeChild(elem);
      });
  }
};
