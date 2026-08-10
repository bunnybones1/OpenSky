export function languageFiles(language: string) {
  return [
    ...['cardMeta', 'cards', 'common', 'vocab', 'tutorial'].map(
      f => `../locales/${language}/${f}.json`
    ),
    ...['game'].map(f => `../../../game/locales/${language}/${f}.json`),
    `../../../webapp/locales/${language}/webapp.json`,
    `../../quests/locales/${language}/quests.json`
  ].map(
    t =>
      [
        //@ts-ignore
        __dirname,
        t
      ] as const
  )
}

export const languageFileIDs = {
  'cardMeta.json': 9,
  'cards.json': 3,
  'common.json': 13,
  'vocab.json': 15,
  'game.json': 5,
  'tutorial.json': 7,
  'webapp.json': 11,
  'quests.json': 17
}
