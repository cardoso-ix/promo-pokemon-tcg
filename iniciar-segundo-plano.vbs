Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
appDir = scriptDir & "\app"
WshShell.CurrentDirectory = appDir
WshShell.Run "cmd /c node dist/index.js 1>> app.log 2>> app.err.log", 0, False
