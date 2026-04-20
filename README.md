# Budget Ledger

[![Build Status](https://github.com/josephsandorvoros/Budgeting-app/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/josephsandorvoros/Budgeting-app/actions/workflows/ci.yml)
[![Installers](https://github.com/josephsandorvoros/Budgeting-app/actions/workflows/build-installers.yml/badge.svg)](https://github.com/josephsandorvoros/Budgeting-app/actions/workflows/build-installers.yml)
[![Latest Tag](https://img.shields.io/github/v/tag/josephsandorvoros/Budgeting-app?label=latest%20tag)](https://github.com/josephsandorvoros/Budgeting-app/releases)

This is a beta app and a proof of concept for me. I set out to make an app I could use, but also something I could give to others. Partially to show I could do it, partially to write up a blog post about it, partially to add it to my portfolio and learn from it. It a local-first desktop budgeting app with personal and business budget workflows, annual and monthly planning, transaction management, recurring bills, balance sheet tracking, data import/export, and reusable templates. It was made with AI assistance (Github CoPilot); I want to be clear and upfront about that. It may have updates, but it may not also, I don't plan on this becoming anything other than a side project.

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

Windows installer (.exe):

npm run dist:win

macOS installer (.dmg, run on macOS or CI):

npm run dist:mac

Linux installer (.AppImage, run on Linux or CI):

npm run dist:linux

Artifacts are written to the release folder.

## End-User Install (Windows)

1. Download the latest `Budget Ledger-*-win-x64.exe` from GitHub Releases.
2. Run the installer and follow the prompts.
3. Launch Budget Ledger from Start Menu/Desktop.

No extra runtime or dependency installation is required.

## Latest Downloads

- Release page: https://github.com/josephsandorvoros/Budgeting-app/releases
- Beta 1.3 page: https://github.com/josephsandorvoros/Budgeting-app/releases/tag/beta1.3
- Beta 1.3 Windows installer: https://github.com/josephsandorvoros/Budgeting-app/releases/download/beta1.3/Budget.Ledger-1.0.0-win-x64.exe

## CI Installers

Native multi-platform installer builds are configured in:

.github/workflows/build-installers.yml

Use that workflow to generate Windows, macOS, and Linux artifacts from one repository push.

To publish a beta release from this repository, create and push a tag such as `beta1.3`.

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

To make the workflow work to cerate the installers
Push the tag first (from local):
```
git tag beta1.4
git push origin beta1.4
```

✓ Workflow triggers, builds installers

Then create the release on GitHub pointing to that tag:

Go to Releases → "Draft a new release"
Click "Choose a tag" → select the tag you just pushed
Add release notes
Publish

## Notes

- Branding: Budget Ledger
- Frameless Electron window with custom title bar
- Local data-first behavior by design
