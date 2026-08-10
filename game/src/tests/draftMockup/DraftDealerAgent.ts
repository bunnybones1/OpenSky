import DealerPhase from './DealerPhase'
import { DealerStepName } from './dealerStepTypes'
import { avatarSelectionAwaitAndAccept } from './draftDealerSteps/avatarSelectionAwaitAndAccept'
import { avatarSelectionBegin } from './draftDealerSteps/avatarSelectionBegin'
// import { acceptPlayerAvatarSelection } from './draftDealerSteps/acceptPlayerAvatarSelection'
import { cardSelectionAccept } from './draftDealerSteps/cardSelectionAccept'
import { determineNextEventIsBoonChoice } from './draftDealerSteps/determineNextEventIsBoonChoice'
import { determineNextEventIsLifeAuction } from './draftDealerSteps/determineNextEventIsLifeAuction'
import { determineNextEventIsRandomizer } from './draftDealerSteps/determineNextEventIsRandomizer'
import { determineThereIsNoNextEvent } from './draftDealerSteps/determineThereIsNoNextEvent'
import { ensureAvatarCubeIsPacked } from './draftDealerSteps/ensureAvatarCubeIsPacked'
import { ensureCardCubeIsPacked } from './draftDealerSteps/ensureCardCubeIsPacked'
import { ensureEventCubeIsPacked } from './draftDealerSteps/ensureEventCubeIsPacked'
import { ensureThereAreEnoughPlayers } from './draftDealerSteps/ensureThereAreEnoughPlayers'
import { eventSelectionAccept } from './draftDealerSteps/eventSelectionAccept'
import { eventSelectionBegin } from './draftDealerSteps/eventSelectionBegin'
import { genericSelectionAwait } from './draftDealerSteps/genericSelectionAwait'
import { handOutOnePackToPlayers } from './draftDealerSteps/handOutOnePackToPlayers'
import { playEventBoonChoice } from './draftDealerSteps/playEventBoonChoice'
import { playEventLifeAuction } from './draftDealerSteps/playEventLifeAuction'
import { playEventRandomizer } from './draftDealerSteps/playEventRandomizer'
// import { handOutPacksToPlayers } from './draftDealerSteps/handOutPacksToPlayers'
// import { waitAMoment } from './draftDealerSteps/waitAMoment'
import { waitIndefinitely } from './draftDealerSteps/waitIndefinitely'
import type DraftState from './DraftState'

export default class DraftDealerAgent {
  phases: Map<DealerStepName, DealerPhase>
  private _intervalId: NodeJS.Timeout
  constructor(state: DraftState) {
    const phases = new Map<DealerStepName, DealerPhase>()

    function phase(name: DealerStepName) {
      if (!phases.has(name)) {
        phases.set(name, new DealerPhase(name))
      }
      return phases.get(name)!
    }
    phase('start').might(() => true, 'acceptingPlayers')
    phase('acceptingPlayers').might(ensureThereAreEnoughPlayers, 'packCardCube')
    phase('packCardCube').might(ensureCardCubeIsPacked, 'packEventCube')
    phase('packEventCube').might(ensureEventCubeIsPacked, 'packAvatarCube')
    phase('packAvatarCube').might(
      ensureAvatarCubeIsPacked,
      'avatarSelectionStart'
    )
    phase('avatarSelectionStart').might(
      avatarSelectionBegin,
      'avatarSelectionEnd'
    )
    phase('avatarSelectionEnd').might(
      avatarSelectionAwaitAndAccept,
      'eventSelectionStart'
    )
    phase('eventSelectionStart').might(
      eventSelectionBegin,
      'eventSelectionMiddle'
    )
    phase('eventSelectionMiddle').might(
      genericSelectionAwait,
      'eventSelectionEnd'
    )
    phase('eventSelectionEnd').might(eventSelectionAccept, 'playNextEvent')
    // phase('playNextEvent').might(waitAMoment, 'handOutOnePackToPlayers')
    phase('playNextEvent').might(
      determineNextEventIsLifeAuction,
      'playLifeAuctionEvent'
    )
    phase('playNextEvent').might(
      determineNextEventIsRandomizer,
      'playRandomizerEvent'
    )
    phase('playNextEvent').might(
      determineNextEventIsBoonChoice,
      'playBoonChoiceEvent'
    )
    phase('playNextEvent').might(
      determineThereIsNoNextEvent,
      'waitIndefinitely'
    )
    phase('playLifeAuctionEvent').might(
      playEventLifeAuction,
      'handOutOnePackToPlayers'
    )
    phase('playBoonChoiceEvent').might(
      playEventBoonChoice,
      'handOutOnePackToPlayers'
    )
    phase('playRandomizerEvent').might(
      playEventRandomizer,
      'handOutOnePackToPlayers'
    )
    phase('handOutOnePackToPlayers').might(
      handOutOnePackToPlayers,
      'acceptPlayerCardChoices'
    )
    phase('acceptPlayerCardChoices').might(cardSelectionAccept, 'playNextEvent')
    phase('waitIndefinitely').might(waitIndefinitely, 'waitIndefinitely')

    this.phases = phases

    this._intervalId = setInterval(() => {
      if (phases.has(state.dealerCurrentStep)) {
        const newStep = phases.get(state.dealerCurrentStep)!.attempt(state)
        if (newStep) {
          state.dealerCurrentStep = newStep
        }
      } else {
        console.warn(
          `no such dealer step defined: ${state.dealerCurrentStep!}... wait indefinitely`
        )
        state.dealerCurrentStep = 'waitIndefinitely'
      }
    }, 40)
  }
  cleanup() {
    clearInterval(this._intervalId)
  }
}
