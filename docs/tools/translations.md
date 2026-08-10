# Translations

OpenSky translations are managed through the language manager package and a Crowdin-based sync workflow.

## Scope

This area covers:

- preparing English source strings
- uploading source strings to Crowdin
- downloading translated files back into the repository
- checking untranslated or unsorted language data before release

## Key Package

The main translation tooling lives in `lib/language-manager/`.

Useful scripts there include:

- `pnpm sort`: sort English translation JSON files into a stable order
- `pnpm crowdin-upload`: upload English source strings to Crowdin
- `pnpm crowdin-download`: download translated files from Crowdin
- `pnpm crowdin-untranslated`: report untranslated strings

## Related Docs

- [Managing Translations](../workflows/translations.md)
- [Integrations](../integrations/README.md)
- [`lib/language-manager/README.md`](../../lib/language-manager/README.md)
