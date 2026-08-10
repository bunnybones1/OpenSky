export function removeLoadingSpinner() {
  const spinner = document.getElementById('loading')

  if (spinner) {
    spinner.remove()
  }
}
