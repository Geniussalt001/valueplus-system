; Keep the Windows desktop shortcut synchronized with the icon embedded
; in the installed ValuePlus executable. Tauri update mode normally leaves
; an existing shortcut untouched, so Windows can keep displaying its old
; cached icon after an app icon change.
!macro NSIS_HOOK_POSTINSTALL
  ${If} $NoShortcutMode <> 1
    Delete "$DESKTOP\${PRODUCTNAME}.lnk"
    CreateShortcut "$DESKTOP\${PRODUCTNAME}.lnk" "$INSTDIR\${MAINBINARYNAME}.exe" "" "$INSTDIR\${MAINBINARYNAME}.exe" 0
    !insertmacro SetLnkAppUserModelId "$DESKTOP\${PRODUCTNAME}.lnk"
  ${EndIf}

  ; Tell Windows Explorer that icons and shortcuts have changed.
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend
