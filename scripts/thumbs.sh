readarray -d '' entries < <(printf '%s\0' *.mp4 | sort -zV)
i=1
for entry in "${entries[@]}"; do
  # do something with $entry
  ffmpeg -i $i.mp4 -frames:v 1 -s 400x400 $i.jpg
  ((i=i+1))
done
