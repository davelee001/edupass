# Commit each file individually with descriptive messages

Write-Host "Committing files individually..." -ForegroundColor Green

# Backend files
git add backend/src/config/stellar.js
git commit -m "Update Stellar SDK import to @stellar/stellar-sdk"

git add backend/src/routes/sponsorship.js
git commit -m "Update sponsorship routes with new SDK"

git add backend/src/services/sep10.js
git commit -m "Update SEP-10 service with new SDK"

git add backend/src/services/sponsorship.js
git commit -m "Update sponsorship service with new SDK"

git add backend/src/test-server.js
git commit -m "Add backend test server script"

# Frontend files
git add frontend/index.html
git commit -m "Add Inter font to HTML template"

git add frontend/postcss.config.js
git commit -m "Fix PostCSS configuration syntax"

git add frontend/src/components/Navigation.jsx
git commit -m "Enhance Navigation component with modern design"

git add frontend/src/index.css
git commit -m "Add comprehensive Tailwind styles and animations"

git add frontend/src/pages/IssuerDashboard.jsx
git commit -m "Redesign IssuerDashboard with modern UI"

git add frontend/src/pages/Login.jsx
git commit -m "Enhance Login page with animated design"

git add frontend/tailwind.config.js
git commit -m "Expand Tailwind config with colors and animations"

git add frontend/test-start.js
git commit -m "Add frontend test start script"

Write-Host "`nAll files committed!" -ForegroundColor Green
Write-Host "Pushing to GitHub..." -ForegroundColor Cyan

git push

Write-Host "`nDone! All commits pushed to GitHub." -ForegroundColor Green
