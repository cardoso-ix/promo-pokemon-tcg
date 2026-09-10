Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
appDir = scriptDir & "\app"
WshShell.CurrentDirectory = appDir
WshShell.Run "node dist/index.js", 0, False
