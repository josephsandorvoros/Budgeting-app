# Budget Ledger

[![Build Status](https://github.com/josephsandorvoros/Budgeting-app/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/josephsandorvoros/Budgeting-app/actions/workflows/ci.yml)
[![Installers](https://github.com/josephsandorvoros/Budgeting-app/actions/workflows/build-installers.yml/badge.svg)](https://github.com/josephsandorvoros/Budgeting-app/actions/workflows/build-installers.yml)
[![Latest Tag](https://img.shields.io/github/v/tag/josephsandorvoros/Budgeting-app?label=latest%20tag)](https://github.com/josephsandorvoros/Budgeting-app/releases)

This is a beta app and a proof of concept for me. I set out to make an app I could use, but also something I could give to others. Partially to show I could do it, partially to write up a blog post about it, partially to add it to my portfolio and learn from it. It a local-first desktop budgeting app with personal and business budget workflows, annual and monthly planning, transaction management, recurring bills, balance sheet tracking, data import/export, and reusable templates. It was made with AI assistance (Github CoPilot); I want to be clear and upfront about that. It may have updates, but it may not also, I don't plan on this becoming anything other than a side project. As an additional note, I am working and pushing to check in real world install so for now this likely has lots of little tweaks and frequent updates.

## Stack

- React + Vite
- Electron
- FastAPI (API mode)
- SQLite via better-sqlite3 (desktop mode)

## Install

1. Install Node.js 20+.
2. Install dependencies:

npm install

## Development

Frontend in browser:

npm run dev

Desktop app shell (Electron + Vite):

npm run desktop:dev

## Build

Frontend build:

npm run build

## Desktop Installers

End users do not need to install Node, Python, or any dependencies. The installer bundles everything needed to run the app.
The desktop build also bundles the local FastAPI backend executable and launches it automatically at app startup.

Windows installer (.exe):

npm run dist:win

macOS installer (.dmg, run on macOS or CI):

npm run dist:mac

Linux installer (.AppImage, run on Linux or CI):

npm run dist:linux

Artifacts are written to the release folder.

## Data Reset (Preview Mode)

From Settings -> Manage Data, you can use Reset All Data to completely clear budget data.

- Option A: keep custom templates
- Option B: reset templates back to built-in only

After reset, the app starts with no budgets so users can create their own from scratch.

## Recent Fixes

- Improved startup responsiveness when the local backend is slow to respond by adding safe API load timeouts and local fallback behavior.
- Fixed Annual Budget editability so budget rows can be edited based on the selected budget year (not only when that year has transactions).

## End-User Install (Windows)

1. Download the latest `Budget Ledger-*-win-x64.exe` from GitHub Releases.
2. Run the installer and follow the prompts.
3. Launch Budget Ledger from Start Menu/Desktop.

No extra runtime or dependency installation is required.

### Windows SmartScreen Warning

When running the installer for the first time on Windows, you may see a SmartScreen warning that says "Windows protected your PC". This is normal for unsigned applications and does **not** indicate a security risk. The app is safe to run. All the code is here to see.

To proceed:
- Click "More info"
- Click "Run anyway"

For more details on code signing, see the [License](#license) section.

## Latest Downloads

- Release page: https://github.com/josephsandorvoros/Budgeting-app/releases
- Latest release page: https://github.com/josephsandorvoros/Budgeting-app/releases/latest
- Latest workflow run (installer builds): https://github.com/josephsandorvoros/Budgeting-app/actions/workflows/build-installers.yml

## In-App Updates

Go to Settings -> Updates to:

- view your current installed app version
- check the latest GitHub release
- download the latest installer for your platform

You can run the new installer over the existing install to update in place (no manual uninstall required).

## CI Installers

Native multi-platform installer builds are configured in:

.github/workflows/build-installers.yml

Use that workflow to generate Windows, macOS, and Linux artifacts from one repository push.

To publish a beta release from this repository, create and push a tag such as `beta1.8`.
The workflow will automatically build installers and publish/update the GitHub Release for that tag.

## Documentation Update Checklist

Update this README when any of these change:

- install/run commands
- release tag or direct download links
- platform support or installer filenames
- required prerequisites for developers or end users

Usually skip README edits for:

- internal refactors
- minor styling tweaks
- bug fixes that do not change user/developer workflows

For version-by-version notes, prefer GitHub Release notes.

To trigger automated installer + release publishing, push the tag from local:

Note:
    Bump package.json version for every release you publish.
    Keep using beta tags for release channels (beta1.8, beta1.9, etc.).
    Use semantic versions like:
    1.0.1 for fixes
    1.1.0 for features
    2.0.0 for breaking changes

```
git tag beta1.16
git push origin beta1.16
```

✓ Workflow triggers, builds installers, and publishes the release automatically

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## Notes

- Branding: Budget Ledger
- Frameless Electron window with custom title bar
- Local data-first behavior by design
