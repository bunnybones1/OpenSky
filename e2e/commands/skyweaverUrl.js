module.exports = class OpenSkyUrl {
  async command(path) {
    const url = this.api.globals.SKYWEAVER_URL;

    return `${url}${path}`;
  }
};
