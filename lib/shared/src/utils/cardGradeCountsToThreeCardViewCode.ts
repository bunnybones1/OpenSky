import { DECK_CARDS_REQUIRED } from '../deckConsts'

export enum GRADE {
  BASE,
  SILVER,
  GOLD
}
const gradeLookup = {
  [GRADE.BASE]: 'b',
  [GRADE.SILVER]: 's',
  [GRADE.GOLD]: 'g'
} as const

export function cardGradeCountsToThreeCardViewCode(
  gradeCounts:
    | {
        numGoldCards: number
        numSilverCards: number
        numBaseCards: number
      }
    | null
    | undefined
) {
  const grades: GRADE[] = []
  const gradeKPs: Array<[GRADE, number]> = [
    [GRADE.BASE, gradeCounts?.numBaseCards || 0],
    [GRADE.SILVER, gradeCounts?.numSilverCards || 0],
    [GRADE.GOLD, gradeCounts?.numGoldCards || 0]
  ]
  for (const kp of gradeKPs) {
    for (let i = 0; i < kp[1]; i++) {
      grades.push(kp[0])
    }
  }

  //pretend incomplete decks are filled with base cards
  while (grades.length < DECK_CARDS_REQUIRED) {
    grades.push(GRADE.BASE)
  }

  grades.sort().reverse()
  const cut1 = ~~(grades.length / 3)
  const cut2 = ~~((grades.length / 3) * 2)
  const set1 = grades.slice(0, cut1)
  const set2 = grades.slice(cut1, cut2)
  const set3 = grades.slice(cut2, grades.length)
  const frontHighestValue = set1.sort().reverse()[0]
  const backLowestValue = set3.sort()[0]
  const middleGradeCounts = {
    [GRADE.BASE]: 0,
    [GRADE.SILVER]: 0,
    [GRADE.GOLD]: 0
  }
  for (const grade of set2) {
    middleGradeCounts[grade]++
  }
  let middleDominantGrade = GRADE.BASE
  let middleDominantGradeCount = middleGradeCounts[GRADE.BASE]
  if (middleGradeCounts[GRADE.SILVER] > middleDominantGradeCount) {
    middleDominantGradeCount = middleGradeCounts[GRADE.SILVER]
    middleDominantGrade = GRADE.SILVER
  }
  if (middleGradeCounts[GRADE.GOLD] > middleDominantGradeCount) {
    middleDominantGradeCount = middleGradeCounts[GRADE.GOLD]
    middleDominantGrade = GRADE.GOLD
  }
  return `${gradeLookup[frontHighestValue]}${gradeLookup[middleDominantGrade]}${gradeLookup[backLowestValue]}` as const
}
