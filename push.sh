#!/usr/bin/env bash
set -e
REMOTE="https://github.com/YOUR_USERNAME/poster-api.git" # change this
git init
git add .
git commit -m "Initial commit: poster-api"
git branch -M main
git remote add origin "$REMOTE"
git push -u origin main
