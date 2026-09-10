Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
appDir = currentDir & "\app"
WshShell.CurrentDirectory = appDir
WshShell.Run "cmd /c node dist/index.js", 0, False
