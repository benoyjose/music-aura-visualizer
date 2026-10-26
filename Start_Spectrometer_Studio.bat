@echo off
cd /d "%~dp0"
xcopy /E /I /Y /D "src" "dist\SpectrometerStudio-win-x64\resources\app\src" >nul 2>&1
xcopy /E /I /Y /D "assets" "dist\SpectrometerStudio-win-x64\resources\app\assets" >nul 2>&1
copy /Y "package.json" "dist\SpectrometerStudio-win-x64\resources\app\package.json" >nul 2>&1
cd /d "%~dp0dist\SpectrometerStudio-win-x64"
start "" "SpectrometerStudio.exe"
