# FVTT_D35E_Community_SRD
A community-managed SRD for the DnD 3.5 System for Foundry VTT.

## Supported Version: 2.4.3

## Pre-Requisites:

- Sorry only works for **Windows** at present
- Smelter - https://github.com/Muttley/smelter
- GIT for Windows (to submit changes back to GIT Hub)

## Configuration

- Make sure the paths.cfg file is amended to reflect the paths to NodeJs, Smelter and your D35E packs directory.

### Import the SRD as is

- Run Import_to_LevelDB.bat - this will overwrite the default system compendiums with the contents of the SRD directory of this repo.

### Changing things

- Add your own enhancements using Method A or B.
- You can "edit via GUI then export" (Method A) or "export then edit via Text Editor and re-import " (Method B).
- Submissions via Pull Request (requires GIT)
- Only SRD submissions covered by the Open Gaming Licence will be considered for approval. **NO COPYRIGHT BREACHES**.

#### METHOD A - Edit in Foundry before exporting:

0. Probably best to create a branch and switch to it
1. Open a D35E world in Foundry.
2. Unlock the system compendium to make manual changes.
3. Close Foundry.
4. Run Export_to_JSON.bat
5. Find the json file(s) you want to change
6. copy it/them to the SRD folder
7. Commit & Raise a Pull Request to share your change.

#### METHOD B - Edit JSON after exporting, then re-import:

0. Probably best to create a branch and switch to it
1. Run Export_to_JSON.bat
2. Find the json file you want to change
3. Edit the file in any text editor
4. copy it to the SRD folder, overwriting the out-the-box version
5. Run Import_to_LevelDB.bat
6. Commit & Raise a Pull Request to share your change.

## FAQ

Q: Can I use the built-in Export to JSON feature use those files instead?
A: No it doesn't look like it. This JSON format crashes Smelter. You need to stick with the Smelter-exported format.

