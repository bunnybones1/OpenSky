import { _setHoveredActionHistoryCardAsync } from '~/systems/ActionHistoryPopupManager'
import { INTERNAL_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_setHoveredCardAsync } from '~/systems/CardPopupManager'

export function setHoveredActionHistoryCardAsync(
  ...args: Parameters<typeof _setHoveredActionHistoryCardAsync>
): ReturnType<typeof _setHoveredActionHistoryCardAsync> {
  // Hide a regular popup card if there is one.
  if (args[0]) {
    INTERNAL_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_setHoveredCardAsync(undefined)
  }
  return _setHoveredActionHistoryCardAsync(...args)
}

export function setHoveredCardAsync(
  ...args: Parameters<
    typeof INTERNAL_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_setHoveredCardAsync
  >
): ReturnType<
  typeof INTERNAL_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_setHoveredCardAsync
> {
  // Hide an action history popup card if there is one.
  if (args[0]) {
    _setHoveredActionHistoryCardAsync(undefined, undefined)
  }
  return INTERNAL_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_setHoveredCardAsync(...args)
}
