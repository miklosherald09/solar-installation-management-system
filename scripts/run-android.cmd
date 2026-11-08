@echo off
setlocal EnableDelayedExpansion

REM Use a short drive path (X:) for the build to avoid MAX_PATH (260 char) errors
REM Map X: to the project directory
subst X: "%CD%" 2>nul

REM Use a short path for Gradle cache
set "GRADLE_USER_HOME=C:\tmp\.gradle"
if not exist "%GRADLE_USER_HOME%" mkdir "%GRADLE_USER_HOME%"

REM Clean stale CMake cache if present
if exist "X:\android\app\.cxx" (
    echo Cleaning stale CMake cache...
    rmdir /S /Q "X:\android\app\.cxx" 2>nul
)

echo Building from short path X:\ (project: %CD%)
echo.
call npx react-native run-android %*
set EXITCODE=%ERRORLEVEL%

REM Unmap the drive
subst X: /d 2>nul

exit /b %EXITCODE%