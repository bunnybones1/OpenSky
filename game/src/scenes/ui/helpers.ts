import env from '~/env'
import CardRewardSystem from '~/systems/cardPositioning/CardRewardSystem'
import { getTutorial } from '~/tutorial/Tutorial'
import { changeUrlParamAndReload } from '~/utils/location'
import { world } from '~/world'

export const continueHandler = async (urlPath: string = '') => {
  if (world.hasSystem(CardRewardSystem)) {
    await world.getSystem(CardRewardSystem).flipAll()
  }

  // const path = gameMode === GameMode.TUTORIAL ? '/play/tutorial' : ''
  const redir = () => {
    window.location.href = `${env.WEBAPP_URL}${urlPath}`
  }
  setInterval(redir, 10000)
  redir()
}

export const continueToNextTutorial = async () => {
  await world.getSystem(CardRewardSystem).flipAll()
  const nextLevel = getTutorial().config.nextLevel
  changeUrlParamAndReload('tutorialLevel', `${nextLevel}`)
}

export const restartThisTutorial = async () => {
  await world.getSystem(CardRewardSystem).flipAll()

  window.location.reload()
}

export const goBackToWebapp = () => {
  const redir = () => {
    window.location.href = `${env.WEBAPP_URL}`
  }
  setInterval(redir, 10000)
  redir()
}
