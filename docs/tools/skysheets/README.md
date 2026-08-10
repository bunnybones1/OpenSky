# Sky Sheets

Sky Sheets is the repository's spreadsheet-style editor for OpenSky design data.

It exists to give designers and contributors a table-oriented editing workflow without
moving the source of truth out of git. Cards, cosmetics, quests, and related content can be
edited through a UI, but the underlying data still lives in normal files that can be reviewed,
branched, merged, and audited like code.

![Screenshot of Sky Sheets](skysheets.jpeg)

## Start It

From the repository root:

```sh
cd sheets
pnpm dev
```

That launches the Tauri-based desktop editor for local design-data work.

## What You See

Surface | Purpose
--- | ---
[Sheets](./sheets/README.md) | Main data tables for cards, cosmetics, and related content domains
[Tools](./tools.md) | UI settings, debugging helpers, and local editor utilities
Problems | Validation output that must be clean for builds to pass
Console | Developer-oriented debugging output

## What It Edits

Sky Sheets works on the repository's design-data model, where individual values are stored
as files and later packaged into TypeScript, JSON, SQL, and other runtime outputs.

See [Design Data](../../specifications/shared-modules/design-data.md) for the underlying model.

Examples:

Path | Meaning | Example contents
--- | --- | ---
`design-data/raw/sheets/cards/21/cost` | Mana cost for card `21` | `2`
`design-data/raw/sheets/cards/21/name` | Display name for card `21` | `Psyche`
`design-data/raw/sheets/cards/21/artSlug` | Art reference for card `21` | `unit-shapo-60`
`design-data/raw/sheets/stickers/1/name` | Display name for sticker `1` | `Hello`

You can edit that data directly in a text editor if you want. Sky Sheets exists because a lot
of this information is easier to understand, validate, and maintain in table form.

## The Data vs the Tool

### The Data

The design data is file-based, atomic, and format-light. A path tells you what a value means,
and the value itself can be turned into downstream outputs later.

That matters because the data is not locked inside the editor. The repository can still:

- diff it in pull requests
- merge it across branches
- inspect history with normal git tools
- regenerate runtime artifacts from the same raw source

### The Tool

Sky Sheets is the editing layer on top of that data model. It is modeled after a spreadsheet,
with one sheet per concern such as cards, art, stickers, titles, quests, or cardbacks.

Rows can contain:

- direct file-backed values
- references to related rows in other sheets
- synthetic columns that exist only for visibility, validation, or derived relationships

Examples of synthetic data:

- an art row showing which cards reference it
- a validation column showing rows with missing or inconsistent references
- filtered or grouped views that help authors understand a change before committing it

## Implementation Notes

Sky Sheets currently lives in the `sheets/` package and is built with:

- TypeScript
- React
- Vite
- Tauri

That combination gives the project a desktop-style editor while still using web UI tooling.

## Why It Exists

Sky Sheets replaced older spreadsheet-driven authoring because external spreadsheet tools
were weak at the things the repository cares about most:

- branch-friendly parallel work
- durable line-by-line history
- reliable validation before merge
- safe reconciliation when multiple contributors change the same design space

The file-based plus git-based model also avoids making a hosted spreadsheet service the
system of record for mission-critical game data.

## Why Git Matters Here

Sky Sheets is not just a friendlier editor. It is part of a workflow where design changes are
treated like real repository changes with authorship, review, and history.

That gives the team a few important abilities:

- track who changed a value and when
- understand why a card, reward, or text field changed
- branch content work safely for balance patches, sets, or seasonal updates
- merge conflicting design decisions instead of silently overwriting them

In practice, this means the editor stays convenient without sacrificing traceability.

## Contributor Guidance

- use Sky Sheets when the data is easier to reason about as a table than as raw files
- keep the `Problems` panel clean before opening a pull request
- use normal git review and commit history to explain the intent behind design changes
- remember that changing the tool and changing the data are related, but not the same task

## Related Docs

- [Sheets](./sheets/README.md)
- [Tools](./tools.md)
- [Design Data](../../specifications/shared-modules/design-data.md)
