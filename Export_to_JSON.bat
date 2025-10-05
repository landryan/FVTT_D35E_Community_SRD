@ECHO OFF
call paths.bat
echo node is: %NODE%
echo smelter is: %SMELTER%
echo packs is: %PACKS%

echo Deleting existing export directory if it exists...

rmdir /s export
pause
echo exporting to JSON...
%NODE% %SMELTER% unpack -s %PACKS% -d ".\export" -i leveldb
echo #### EXPORT COMPLETE ####
pause