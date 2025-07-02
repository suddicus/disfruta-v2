#!/usr/bin/env bash
#
# tree-list.sh
# Usage: ./tree-list.sh /path/to/dir

# Recursively print the tree
print_tree() {
  local dir="$1"
  local indent="$2"
  local prefix=""
  # Build indentation prefix
  for ((i=0; i<indent; i++)); do
    prefix+=" "
  done

  # Loop over entries (files & dirs)
  for entry in "$dir"/*; do
    # If nothing matches, skip
    [ -e "$entry" ] || continue

    # Print this entry’s name
    echo "${prefix}$(basename "$entry")"

    # If it’s a directory, recurse with deeper indent
    if [ -d "$entry" ]; then
      print_tree "$entry" $((indent + 4))
    fi
  done
}

# ---- main ----
if [ $# -ne 1 ]; then
  echo "Usage: $0 /path/to/directory"
  exit 1
fi

if [ ! -d "$1" ]; then
  echo "Error: '$1' is not a directory."
  exit 2
fi

print_tree "$1" 0
