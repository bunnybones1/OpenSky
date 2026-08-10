const __charSafetyRegexes = new Map<BMFont, RegExp>()
function escapeSpecialChars(text: string) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#]/g, '\\$&')
}
export function getCharSafetyRegex(font: BMFont) {
  if (!__charSafetyRegexes.has(font)) {
    const charset = escapeSpecialChars(
      font.chars.map(char => char.char).join('')
    )
    const r = new RegExp(`[^${charset}\\s]`, 'g')
    __charSafetyRegexes.set(font, r)
  }
  return __charSafetyRegexes.get(font)!
}

const __fontCharMetaCache = new Map<BMFont, Map<string, Char>>()
export function getFontCharMetaCache(font: BMFont) {
  if (!__fontCharMetaCache.has(font)) {
    const fcmc = new Map<string, Char>()
    for (const char of font.chars) {
      fcmc.set(String(char.char), char)
    }
    __fontCharMetaCache.set(font, fcmc)
  }
  return __fontCharMetaCache.get(font)!
}
