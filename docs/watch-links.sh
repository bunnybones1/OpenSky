#!/bin/bash

# Specify the folder containing your markdown files
markdown_folder="."

# Change to the specified folder
cd "$markdown_folder" || exit

# bash "lint.sh"
bash "check-links.sh"

# Watch for changes in markdown files and execute the script on change
fswatch -l 1 -o -e ".*" -i "\\.md$" . | while read; do
    echo "Changes detected"
    
    # Run the script on change
    # bash "lint.sh"
    bash "check-links.sh"
done