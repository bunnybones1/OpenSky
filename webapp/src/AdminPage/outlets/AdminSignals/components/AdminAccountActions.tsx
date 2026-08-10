import { AccountAction, ActionType } from '~/lib/proto'
import { Box } from '~/shared/components/Base'

const AdminAccountActions = ({ actions }: { actions?: AccountAction[] }) => {
  if (!actions) return <Box color="purple7">Not Banned</Box>

  const bannedAuto = actions.filter((action) => {
    const autoBanned = action.actionType === ActionType.AUTO_BAN
    return autoBanned && action.isActive
  }).length

  if (bannedAuto) return <Box color="warm9">Auto Banned</Box>

  const bannedMod = actions.filter((action) => {
    const modBanned = action.actionType === ActionType.MOD_BAN
    return modBanned && action.isActive
  }).length

  if (bannedMod) return <Box color="warm9">Mod Banned</Box>

  const suspendedAuto = actions.filter((action) => {
    const autoBanned = action.actionType === ActionType.AUTO_BAN
    return autoBanned && action.isActive
  }).length

  if (suspendedAuto) return <Box color="warm8">Auto Suspended</Box>

  const suspendedMod = actions.filter((action) => {
    const modBanned = action.actionType === ActionType.MOD_BAN
    return modBanned && action.isActive
  }).length

  if (suspendedMod) return <Box color="warm8">Mod Suspended</Box>
  const flaggedAuto = actions.filter((action) => {
    const autoFlagged = action.actionType === ActionType.AUTO_FLAG
    return autoFlagged && action.isActive
  }).length

  if (flaggedAuto) return <Box color="warm9">Auto Flagged</Box>

  const flaggedMod = actions.filter((action) => {
    const modFalgged = action.actionType === ActionType.MOD_FLAG
    return modFalgged && action.isActive
  }).length

  if (flaggedMod) return <Box color="warm9">Mod Flagged</Box>

  const previouslyBanned = actions.filter((action) => {
    const autoBanned = action.actionType === ActionType.AUTO_BAN
    const modBanned = action.actionType === ActionType.MOD_BAN
    const actionBanned = autoBanned || modBanned
    return actionBanned && !action.isActive
  }).length

  if (previouslyBanned) return <Box color="warm6">Previously Banned</Box>

  const previouslySuspended = actions.filter((action) => {
    const autoSuspended = action.actionType === ActionType.AUTO_SUSPENSION
    const modSuspended = action.actionType === ActionType.MOD_SUSPENSION
    const actionSuspended = autoSuspended || modSuspended
    return actionSuspended && !action.isActive
  }).length

  if (previouslySuspended) return <Box color="warm6">Previously Suspended</Box>

  return <Box>-</Box>
}

export default AdminAccountActions
