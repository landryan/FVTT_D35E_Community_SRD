@ECHO OFF
call paths.bat
echo node is: %NODE%
echo system source is: %SYSTEMSOURCE%

echo Deleting existing system source directory if it exists...

rmdir /s %SYSTEMSOURCE%
pause
echo Exporting to System Source Code...
robocopy SRD "%SYSTEMSOURCE%" /E
echo #### PUSH COMPLETE ####
pause