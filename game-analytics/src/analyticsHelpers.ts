import { MatchData } from 'Match'
import { writeFileSync } from 'fs'

export type FlatMatchData = {
  generalMatchData: string
  gameStateData: string
  moveData: string
}
export function processToCSV(m: MatchData): FlatMatchData {
  // general match data
  const generalMatchDataHeadings =
    'MatchID,MatchStartTime,MatchEndTime,MatchUploadTime,DurationInSec,GameMode,P0Address,P1Address,P0DeckString,P1DeckString,P0DeckVersion,P1DeckVersion,P0DeckType,P1DeckType,TurnCount,MoveCount,P0CardSelection,P1CardSelection,P0OpeningHandSelection,P1OpeningHandSelection,P0DeckCards,P1DeckCards,Winner\n'
  let generalMatchData = `${m.matchID},${formatDate(
    m.matchStartTimeStamp
  )},${formatDate(m.matchEndTimeStamp)},${formatDate(m.dataUploadTimeStamp)},${
    m.durationInSec
  },${m.gameMode},${m.p0Address},${m.p1Address},${m.p0DeckString},${
    m.p1DeckString
  },${m.p0DeckVersion},${m.p1DeckVersion},${m.p0DeckType},${m.p1DeckType},${
    m.turnCount
  },${m.moveCount},"[${m.p0CardSelection.join(
    ','
  )}]","[${m.p1CardSelection.join(',')}]","[${m.p0OpeningHandSelection.join(
    ','
  )}]","[${m.p1OpeningHandSelection.join(',')}]","[${m.p0DeckCards.join(
    ','
  )}]","[${m.p1DeckCards.join(',')}]",${
    m.winner === undefined ? 'NULL' : m.winner
  }\n`

  // game state data
  const gsd = m.gameStateData
  const gameStateDataHeadings =
    'MatchID,TurnNumber,MoveNumber,P0Field,P1Field,P0Hand,P1Hand,P0Deck,P1Deck,P0Graveyard,P1Graveyard,P0Dusted,P1Dusted,P0HeroHP,P1HeroHP,P0Mana,P1Mana,P0MaxMana,P1MaxMana\n'
  let gameStateData = ''

  for (const i of gsd) {
    gameStateData = gameStateData.concat(
      `${i.matchID},${i.turnNumber},${i.moveNumber},"[${i.p0FieldCards}]","[${i.p1FieldCards}]","[${i.p0HandCards}]","[${i.p1HandCards}]","[${i.p0DeckCards}]","[${i.p1DeckCards}]","[${i.p0GraveyardCards}]","[${i.p1GraveyardCards}]","[${i.p0DustedCards}]","[${i.p1DustedCards}]",${i.p0HeroHP},${i.p1HeroHP},${i.p0Mana},${i.p1Mana},${i.p0MaxMana},${i.p1MaxMana}\n`
    )
  }

  // move data
  const md = m.moveData
  const moveDataHeadings =
    'MatchID,TurnNumber,MoveNumber,Player,ActionType,FromID,ToID\n'
  let moveData = ''

  for (const i of md) {
    moveData = moveData.concat(
      `${i.matchID},${i.turnNumber},${i.moveNumber},${i.player},${i.type},${i.fromID},${i.toID}\n`
    )
  }

  // replace all undefined values with empty string
  generalMatchData = generalMatchData.replace(/undefined/g, '')
  gameStateData = gameStateData.replace(/undefined/g, '')
  moveData = moveData.replace(/undefined/g, '')

  return {
    generalMatchData: generalMatchDataHeadings.concat(generalMatchData),
    gameStateData: gameStateDataHeadings.concat(gameStateData),
    moveData: moveDataHeadings.concat(moveData)
  }
}
export function saveCSVFiles(matchCSVData: FlatMatchData) {
  try {
    // create 3 CSV files for the match data
    writeFileSync('./match-data.csv', matchCSVData.generalMatchData)

    writeFileSync('./game-state-data.csv', matchCSVData.gameStateData)

    writeFileSync('./move-data.csv', matchCSVData.moveData)
  } catch (err) {
    console.error(err)
  }
}

function formatDate(date: Date): string {
  return date.toISOString().replace('T', ' ').substring(0, 23)
}
