readarray -d '' entries < <(printf '%s\0' *.mp4 | sort -zV)
i=0
for entry in "${entries[@]}"; do
  # do something with $entry
  echo "$entry to $i.mov" 
  mv $entry $i.mov
  ((i=i+1))
done
