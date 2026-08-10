# Pretty Patch Notes Tool

`pretty-patch-notes` turns internal card change summaries into cleaner player-facing patch note text.

## Where It Lives

The script is currently exposed from `state/cards/package.json` as:

```sh
pnpm pretty-patch-notes
```

## Intended Use

Use it after balance or card-text changes when you already have an internal summary of what changed and want a more readable draft for release communication.

## Expected Workflow

1. Gather the raw card-change summary from the balance or patch work.
2. Run the script from `state/cards`.
3. Review the generated output for tone, naming, and any gameplay nuance that should not be oversimplified.
4. Use the edited result in a blog post, patch notes page, or other player-facing release communication.

## Output Standard

The tool should be treated as a drafting aid, not as an autopublish step. Human review is still required before publishing anything externally.
