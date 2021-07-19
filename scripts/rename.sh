readarray -d '' entries < <(printf '%s\0' *.mp4 | sort -zV)
i=1
for entry in "${entries[@]}"; do
  # do something with $entry
  echo "$entry to $i.mp4"
  mv $entry $i.mp4
  ((i=i+1))
done
