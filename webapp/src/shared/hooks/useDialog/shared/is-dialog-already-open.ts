export const isDialogAlreadyOpen = (idToExclude?: string) => {
  const dialogs = document.getElementsByTagName('dialog')

  for (const dialog of dialogs) {
    if (dialog.open && !!dialog.id && dialog.id !== idToExclude) return true
  }

  return false
}
