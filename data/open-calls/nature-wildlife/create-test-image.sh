#!/bin/bash

# Create a test image using ImageMagick
mkdir -p "$(dirname "$0")/photos"

# Create a simple 1000x800 image with text
convert -size 1000x800 xc:blue \
  -fill white -gravity center -pointsize 60 \
  -annotate +0+0 "Wildlife Photo\nNature Open Call" \
  -bordercolor black -border 2 \
  "$(dirname "$0")/photos/test-wildlife-01.jpg"

# Create another test image
convert -size 1000x800 xc:green \
  -fill white -gravity center -pointsize 60 \
  -annotate +0+0 "Lion in Savanna\nAfrican Wildlife" \
  -bordercolor black -border 2 \
  "$(dirname "$0")/photos/test-wildlife-02.jpg"

echo "Test images created in photos/ directory"
