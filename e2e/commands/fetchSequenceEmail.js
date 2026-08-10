/*
 * Fetches an auth link from an email using IMAP.
 */

const imaps = require('imap-simple');
const simpleParser = require('mailparser').simpleParser;
const htmlParser = require('node-html-parser');

module.exports = class FetchSequenceEmail {
  async command() {
    const config = {
      imap: this.api.globals.IMAP
    };

    const connection = await imaps.connect(config);

    await connection.openBox('INBOX');

    const searchCriteria = [
      ['FROM', 'auth-v0-mail.sequence.app'],
      'UNSEEN'
    ];

    const fetchOptions = {
      bodies: ['HEADER', 'TEXT', ''],
      markSeen: true
    };

    const results = await connection.search(searchCriteria, fetchOptions);
    const texts = results[0].parts.filter((part) => part.which === '');
    const raw = texts[0].body;

    let parsedEmail;

    try {
      parsedEmail = await simpleParser(raw);
    } catch (e) {
      console.log(e);
    }

    const doc = htmlParser.parse(parsedEmail.html);

    const link = doc.querySelector('a[href*="auth"]').getAttribute('href');

    await connection.closeBox(true);
    await connection.end();

    this.api.assert.match(
      link,
      /^https:\/\/auth-v0-signin.sequence.app\//,
      'Auth link is from Sequence Wallet'
    );
    return link;
  }
};
