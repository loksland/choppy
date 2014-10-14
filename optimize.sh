#!/bin/bash

# Args
# $1 Path to local imageOptim
# $2 Image paths separated by line breaks

echo "$2" | "$1" --image-alpha --quit
