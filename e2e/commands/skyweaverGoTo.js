module.exports = class OpenSkyGoTo {
  async command(path) {
    await this.api
      .url(await this.api.openskyUrl(path))
      .assert.not.elementPresent('*[data-id="appLoader"]');

    // Hide notifications since they get in the way of clicking
    await this.api.execute(() => {
      const style = document.createElement('style');
      style.type = 'text/css';
      style.appendChild(document.createTextNode('.notification { display:none; }'));

      document.head.appendChild(style);
    });
  }
};
