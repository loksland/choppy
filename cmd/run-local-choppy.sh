#!/bin/bash

# echo "The script you are running has basename `basename $0`, dirname `dirname $0`"
# echo "The present working directory is `pwd`"

cd "`dirname "$0"`"

cd ../
node choppy # cta_txt="explore" locaction_name="Woollongabba"  # findandreplace "-c15" "-c01"
# node rupert-ui

$SHELL
