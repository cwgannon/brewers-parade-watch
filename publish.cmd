@echo off
rem Double-click this to put the page on the web (GitHub Pages) or to push an update.
rem Needs the GitHub CLI (gh) signed in: https://cli.github.com
setlocal
cd /d "%~dp0"
set REPO=cwgannon/brewers-parade-watch

where gh >nul 2>nul
if errorlevel 1 (
  echo The GitHub CLI is not installed. Get it from https://cli.github.com, run "gh auth login", then run this again.
  pause
  exit /b 1
)

echo.
echo 1/4  Making sure the GitHub repo exists and is public (GitHub Pages needs public on a free account)...
gh repo view %REPO% >nul 2>nul
if errorlevel 1 (
  gh repo create %REPO% --public --description "Brewers World Series parade day on one page: streams, route tracker, traffic cams, fan chatter, lakefront weather." --disable-wiki || goto :fail
) else (
  gh repo edit %REPO% --visibility public --accept-visibility-change-consequences >nul 2>nul
)
git remote get-url origin >nul 2>nul || git remote add origin https://github.com/%REPO%.git

echo 2/4  Pushing the current code to the main branch...
git push -u origin HEAD:main || goto :fail

echo 3/4  Turning on GitHub Pages (serves the main branch, root folder)...
gh api -X POST repos/%REPO%/pages -f build_type=legacy -f "source[branch]=main" -f "source[path]=/" >nul 2>nul
if errorlevel 1 (
  rem Already on? Then just make sure it points at main.
  gh api -X PUT repos/%REPO%/pages -f build_type=legacy -f "source[branch]=main" -f "source[path]=/" >nul 2>nul
)

echo 4/4  Done. GitHub takes a minute or two to build. The page will be at:
echo.
echo      https://cwgannon.github.io/brewers-parade-watch/
echo.
pause
exit /b 0

:fail
echo.
echo Something went wrong (see above). Nothing to undo; just run this again after fixing it.
pause
exit /b 1
