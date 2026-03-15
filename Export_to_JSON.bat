@ECHO OFF
call paths.bat
echo node is: %NODE%
echo packs is: %PACKS%

echo Deleting existing export directory if it exists...

rmdir /s export
pause
echo exporting to JSON...
%NODE% "./utils/unpack.js"
echo #### EXPORT COMPLETE ####
pause