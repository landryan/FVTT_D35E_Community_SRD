@ECHO OFF
call paths.bat
echo node is: %NODE%
echo system source is: %SYSTEMSOURCE%

echo Deleting existing export directory if it exists...

rmdir /s export
pause
echo Importing from System Source Code...
robocopy "%SYSTEMSOURCE%" export /E
echo #### PULL COMPLETE ####
pause