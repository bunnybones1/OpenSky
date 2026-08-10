let intersectionObserver: IntersectionObserver | undefined = undefined
let intersectionObserverOptions: IntersectionObserverInit = {}

const subscribers = new WeakMap<Element, (entry: IntersectionObserverEntry) => void>()

const handleIntersections = (entries: IntersectionObserverEntry[]) =>
  entries.forEach((entry) => {
    const maybeEntry = subscribers.get(entry.target)

    if (maybeEntry) {
      maybeEntry.call(null, entry)
    }
  })

const getIntersectionObserver = () => {
  if (!intersectionObserver) {
    intersectionObserver = new IntersectionObserver(
      handleIntersections,
      intersectionObserverOptions
    )
  }

  return intersectionObserver
}

const setIntersectionObserverOptions = (options: IntersectionObserverInit) => {
  if (intersectionObserver) {
    return
  }

  intersectionObserverOptions = options
}

const watch = (
  domNode: Element,
  callback: (entry: IntersectionObserverEntry) => void
) => {
  if (!domNode || subscribers.has(domNode)) {
    return
  }

  subscribers.set(domNode, callback)
  getIntersectionObserver().observe(domNode)

  return () => unwatch(domNode)
}

const unwatch = (domNode: Element) => {
  getIntersectionObserver().unobserve(domNode)
  subscribers.delete(domNode)
}

const getSubscribers = () => subscribers

export default {
  getSubscribers,
  setIntersectionObserverOptions,
  unwatch,
  watch
}
