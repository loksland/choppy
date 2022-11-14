#!/bin/bash

# Run script
cd "`dirname "$0"`"


exportdir=$(<imagemin_exportdir.txt)

exportdir="${exportdir//__SPACE__/ }"
homepath=~
exportdir="${exportdir//__HOME__/$homepath}"

# TexturePacker --help
now=$(date +"%T")

echo "Publishing imagemin: $now" > imagemin-log.txt
echo "" >> imagemin-log.txt
echo "Got path $exportdir" >> imagemin-log.txt
echo "" >> imagemin-log.txt

cd "${exportdir}"

#say $PWD

imagemin ./*.png --out-dir=. --plugin=pngquant
#sleep 3
