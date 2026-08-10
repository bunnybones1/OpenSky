#!/bin/bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"

has_errors=0

while IFS= read -r -d '' file; do
    base_path="$(dirname "$file")"

    while IFS= read -r raw_link; do
        link="$raw_link"
        link="${link#<}"
        link="${link%>}"
        link="${link%%#*}"
        link="${link%% \"*}"
        link="${link%% \'*}"
        link="$(echo "$link" | xargs)"

        if [[ -z "$link" ]]; then
            continue
        fi
        if [[ "$link" =~ ^(https?:|mailto:|tel:) ]]; then
            continue
        fi
        if [[ "$link" == "{"* ]]; then
            continue
        fi

        if [[ "$link" == /* ]]; then
            full_link="$repo_root$link"
        else
            full_link="$base_path/$link"
        fi

        if ! [ -e "$full_link" ]; then
            echo "Broken link in $file: $link -> $full_link"
            has_errors=1
        fi
    done < <(perl -ne 'while(/\[[^][]*\]\(([^)]+)\)/g){print "$1\n"}' "$file")
done < <(find "$script_dir" -type f -name "*.md" -print0)

exit "$has_errors"
