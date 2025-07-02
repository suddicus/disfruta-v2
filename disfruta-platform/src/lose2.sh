#!/usr/bin/env bash
# make-tree.sh
# Usage: ./make-tree.sh /path/to/dir

set -euo pipefail

# Recursively prints a directory tree:
#   $1 = directory
#   $2 = prefix string (e.g. "", "│   ", "    ")
print_tree() {
  local dir="$1"
  local prefix="$2"
  local entries=( "$dir"/* )
  local count=${#entries[@]}

  (( count == 0 )) && return

  for idx in "${!entries[@]}"; do
    local path="${entries[idx]}"
    [[ -e "$path" ]] || continue

    local name=$(basename "$path")
    local last=$(( idx == count - 1 ))
    local branch=$(( last )) && echo -n "└── " || echo -n "├── "

    printf "%s%s%s\n" "$prefix" "$( ((last)) && printf "└── " || printf "├── ")" "$name"

    if [[ -d "$path" ]]; then
      if (( last )); then
        print_tree "$path" "${prefix}    "
      else
        print_tree "$path" "${prefix}│   "
      fi
    fi
  done
}

main() {
  if (( $# != 1 )); then
    echo "Usage: $0 /path/to/directory"
    exit 1
  fi

  # Strip trailing slash, then resolve to absolute path
  local target="${1%/}"
  # Use realpath (Linux) or readlink -f; fallback: pwd + target
  if command -v realpath >/dev/null; then
    target=$(realpath "$target")
  elif command -v readlink >/dev/null; then
    target=$(readlink -f "$target")
  else
    # best effort: if it's relative, prepend $PWD
    [[ "$target" = /* ]] || target="$PWD/$target"
  fi

  [[ -d "$target" ]] || {
    echo "Error: '$target' is not a directory."
    exit 2
  }

  # Now basename(target) will be the real dir name, even if you passed “.”
  local base=$(basename "$target")
  local outfile="structure-${base}.txt"

  {
    echo "$base"
    print_tree "$target" ""
  } > "$outfile"

  echo "Tree written to $outfile"
}

main "$@"
