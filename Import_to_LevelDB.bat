@ECHO OFF
call paths.bat
echo node is: %NODE%
echo smelter is: %SMELTER%
echo packs is: %PACKS%

echo #### WARNING! Default Foundry System Data will be overwritten with the contents of the SRD directory! ####

:choice
SET /P choice=Are you sure you want to do this? (Y/N):

IF /I "%choice%"=="Y" GOTO yes
IF /I "%choice%"=="N" GOTO no

ECHO Invalid input. Please enter Y or N
GOTO choice

:yes
ECHO You chose Yes. Proceeding
%NODE% %SMELTER% pack -s "./SRD" -d %PACKS% -o leveldb -i json 
echo #### IMPORT COMPLETE ####
PAUSE
EXIT

:no
ECHO You chose No. Exiting - nothing has been Imported!
PAUSE
EXIT