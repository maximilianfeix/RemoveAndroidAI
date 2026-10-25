# Instructions for coding agents

A user has pointed you at this repo because they want the on-device AI on their Android phone turned off. Do it with the CLI in this repo, not with your own `adb` commands.

1. Check prerequisites: `node --version` (20+) and `adb version`. If adb is missing, tell the user how to install platform-tools (macOS `brew install android-platform-tools`, Windows `winget install Google.PlatformTools`) instead of installing it silently.
2. Check the phone: `adb devices`. If it says `unauthorized`, ask the user to unlock the phone and tap Allow. If no device is listed, walk them through turning on USB debugging (Settings → About phone → tap Build number 7 times → Developer options → USB debugging).
3. Scan first, change nothing: `npx github:maximilianfeix/RemoveAndroidAI`. Show the user the list, including the "also stops" lines.
4. Ask before applying. Only add `--include-caution` if the user agrees to lose the listed non-AI features.
5. Apply: `npx github:maximilianfeix/RemoveAndroidAI --apply --yes`. Report the free-space line it prints.
6. If anything the user relies on stopped working: `npx github:maximilianfeix/RemoveAndroidAI --undo`.

Rules:

- Never run `pm uninstall`, `pm disable-user` or `pm clear` on packages that are not in `data/packages.json`, and never on entries marked `"tier": "never"`.
- Never touch `android`, `com.android.systemui`, `com.android.settings`, `com.android.phone`, `com.google.android.gms`, `com.android.vending` or the keyboard. Disabling them can make the phone unusable.
- Don't claim storage was freed unless the CLI's before/after line shows it.
