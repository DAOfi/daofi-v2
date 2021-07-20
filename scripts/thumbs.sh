readarray -d '' entries < <(printf '%s\0' *.mp4 | sort -zV)
i=1
for entry in "${entries[@]}"; do
  # do something with $entry
  ffmpeg -ss 0.5 -i $i.mp4 -vframes 1 -s 400x400 -f mjpeg $i.jpg
  ((i=i+1))
done
