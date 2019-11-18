#!/bin/bash
cd "`dirname "$0"`"

CHANGELOG_DOC_PATH="./CHANGELOG.md"

# Bash colours
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;93m'
NC='\033[0m' # No Color
if [ -z "$(git status --porcelain)" ]; then  # No commits 
  
  # Use prev commit comment as changelog entry
  PRE_COMMIT_COMMENT=$(git log -1 --pretty=%B)
  echo -e "${YELLOW}Exitting - no uncommitted changes.${NC}"
  exit 0
  
else 
  # Prompt for commit comment, commit all changes 
  
  git status
  
  echo -e "${BLUE}Enter GIT commit comment:${NC}"
  read LOG_MESSAGE
  
fi 

# Extract the previous version
VERSION_PREV=$(cat package.json \
  | grep version \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g')
VERSION_PREV="$(echo -e "${VERSION_PREV}" | tr -d '[:space:]')" # Strip whitespace

# Tick the package version 
VERSION_NEXT=$(npm version patch --no-git-tag-version)
VERSION_NEXT=$(echo $VERSION_NEXT | cut -c 2-)

if [[ ${#VERSION_NEXT}  == 0 ]]; then
  echo -e "${RED}Npm version patch failed.${NC}"
  exit 0
fi

# Update change log doc

DATE=$(date +"%d-%m-%Y") # Get date string
PREV_LOG_LINE_PREFIX="- v$VERSION_PREV"
LOG_LINE="- v$VERSION_NEXT - ($DATE) $LOG_MESSAGE"

echo -e "${YELLOW}${LOG_LINE}${NC}"

FOUND_PREV_LOG=0
while read a; do
    if [[ $a == "$PREV_LOG_LINE_PREFIX"* ]]; then # If line starts with previous log message prefix
      FOUND_PREV_LOG=1
      echo "$LOG_LINE" # Add new log message 
    fi
    echo "$a"

done < "$CHANGELOG_DOC_PATH" > "$CHANGELOG_DOC_PATH.tmp" # Work with tmp file

# Check to see changelog was updated successfully
if [[ $FOUND_PREV_LOG == 0 ]]; then
  echo -e "${RED}Failed to find previous changelog entry${NC}"
  echo -e "${YELLOW}${PREV_LOG_LINE_PREFIX}${NC}"
  
  rm "$CHANGELOG_DOC_PATH.tmp"
  exit 0
fi

mv "$CHANGELOG_DOC_PATH.tmp" "$CHANGELOG_DOC_PATH"

# Commit and push GIT 

git add --all
git commit -m "$LOG_MESSAGE (v$VERSION_NEXT)"
git push

echo -e "${GREEN}Committed & pushed GIT changes.${NC}"

npm publish 

echo -e "${GREEN}Published to NPM.${NC}"

# End of publish script.
# Perform any additional operations below.

npm install choppy -g
  
$SHELL

