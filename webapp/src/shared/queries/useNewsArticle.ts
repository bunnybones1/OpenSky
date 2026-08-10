export interface PostOrPageWithImages {
  id: string
  slug: string
  title: string
  images: {
    square?: string
    landscape?: string
    vertical?: string
  }
  isNew: boolean
}

type ArticleSelect = (
  data: PostOrPageWithImages[]
) => PostOrPageWithImages | undefined

interface NewsArticleResult {
  article: PostOrPageWithImages | undefined
  isLoading: boolean
}

// News is intentionally disabled until a new content source is available.
// Keep the existing hook shape so its consumers render without making requests.
export const useNewsArticle = (_select: ArticleSelect): NewsArticleResult => ({
  article: undefined,
  isLoading: false
})

export const useMarkArticleAsSeen = () => ({
  mutate: (_id: string) => undefined
})
