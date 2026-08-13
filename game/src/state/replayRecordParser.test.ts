import { parseReplayRecords } from './replayRecordParser'

describe('replay record parser', () => {
  it('restores the Map values required by WASM player-secret decoding', () => {
    const [record] = parseReplayRecords(
      JSON.stringify([
        {
          type: 'init',
          secrets: [
            [
              {
                instances: { dataType: 'Map', value: [] },
                secret: {
                  cardRarities: {
                    dataType: 'Map',
                    value: [
                      ['6', 'base'],
                      ['68', 'silver']
                    ]
                  }
                }
              },
              []
            ]
          ]
        }
      ])
    ) as any[]

    expect(record.secrets[0][0].instances).toBeInstanceOf(Map)
    expect(record.secrets[0][0].secret.cardRarities).toEqual(
      new Map([
        ['6', 'base'],
        ['68', 'silver']
      ])
    )
  })
})
