' =====================================
' 文件索引服务静默启动脚本 (Windows)
' 无命令行窗口，后台运行
' =====================================

Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' 获取脚本所在目录
strScriptPath = objFSO.GetParentFolderName(WScript.ScriptFullName)
strBatPath = objFSO.BuildPath(strScriptPath, "启动文件索引服务.bat")

' 检查 .bat 文件是否存在
If Not objFSO.FileExists(strBatPath) Then
    MsgBox "错误: 未找到启动脚本" & vbCrLf & strBatPath, vbCritical, "文件索引服务"
    WScript.Quit 1
End If

' 静默运行 .bat 文件（窗口隐藏）
objShell.Run """" & strBatPath & """", 0, False

WScript.Quit 0
