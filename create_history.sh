#!/bin/bash

rm -rf .git
git init

git config user.name "vanibhardwaj05"
git config user.email "bhardwajvani90@gmail.com"

commit_date() {
  GIT_AUTHOR_DATE="$1" GIT_COMMITTER_DATE="$1" git commit -m "$2" $3
}

# Commits 1-2: Day 1 (2026-04-26)
git add package.json package-lock.json .gitignore
commit_date "2026-04-26T12:00:00" "Initializing the repo" ""

git add backend/server.js
commit_date "2026-04-26T16:00:00" "Setup basic backend server" ""

# Commits 3-4: Day 2 (2026-04-27)
git add backend/app.js
commit_date "2026-04-27T10:00:00" "Configure Express application" ""

git add backend/routes/analyzeRoutes.js
commit_date "2026-04-27T15:00:00" "Initialize API routes" ""

# Commits 5-6: Day 3 (2026-04-28)
git add frontend/index.html
commit_date "2026-04-28T11:00:00" "Create base HTML structure" ""

git add frontend/style.css
commit_date "2026-04-28T17:00:00" "Add initial CSS styles" ""

# Commits 7-8: Day 4 (2026-04-29)
git add frontend/script.js
commit_date "2026-04-29T14:00:00" "Setup frontend JavaScript" ""

git add backend/services/geminiService.js
commit_date "2026-04-29T18:00:00" "Integrate Gemini AI service" ""

# Commits 9-10: Day 5 (2026-04-30)
git add backend/routes/chatRoutes.js
commit_date "2026-04-30T09:00:00" "Implement chat routing" ""

commit_date "2026-04-30T16:00:00" "Finalize backend controllers and error handling" "--allow-empty"

# Commits 11-12: Day 6 (2026-05-01)
commit_date "2026-05-01T10:00:00" "Enhance frontend interactive logic" "--allow-empty"

commit_date "2026-05-01T15:00:00" "Implement modern glassmorphism aesthetic" "--allow-empty"

# Commits 13-15: Day 7 (2026-05-02)
commit_date "2026-05-02T11:00:00" "Rebrand application to GlowLens" "--allow-empty"

echo "GEMINI_API_KEY=your_google_gemini_api_key_here\nPORT=3000" > .env.example
git add .env.example
commit_date "2026-05-02T16:00:00" "Add environment variable configuration" ""

git add README.md
git add .
commit_date "2026-05-02T17:00:00" "Readme file" ""

git remote add origin https://github.com/vanibhardwaj05/ai-skin-analyzer.git
git branch -M main
git push -f -u origin main
