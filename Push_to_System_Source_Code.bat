@ECHO OFF
call paths.bat
echo node is: %NODE%
echo system source is: %SYSTEMSOURCE%

echo Deleting existing temporary source directory if it exists...

rmdir /s source
pause
echo Exporting to Tempoary Source Directory...
robocopy SRD source /E
pause
echo "Lowercasing all files and directories in the temporary source directory..."
pwsh -File ".\lowercase.ps1"

rem echo Deleting existing system source directory if it exists...
rem rmdir /s %SYSTEMSOURCE%
rem pause
rem echo Exporting to System Source Code...
rem robocopy source "%SYSTEMSOURCE%" /E
rem echo #### PUSH COMPLETE ####
rem pause