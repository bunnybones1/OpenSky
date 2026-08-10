module.exports = class SequenceUrl {
  async command(path) {
    const url = this.api.globals.SEQUENCE_URL;

    return `${url}${path}`;
  }
};
