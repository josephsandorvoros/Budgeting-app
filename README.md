# Budget Ledger

[![Build Status](https://github.com/josephsandorvoros/Budgeting-app/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/josephsandorvoros/Budgeting-app/actions/workflows/ci.yml)
[![Installers](https://github.com/josephsandorvoros/Budgeting-app/actions/workflows/build-installers.yml/badge.svg)](https://github.com/josephsandorvoros/Budgeting-app/actions/workflows/build-installers.yml)
[![Latest Tag](https://img.shields.io/github/v/tag/josephsandorvoros/Budgeting-app?label=latest%20tag)](https://github.com/josephsandorvoros/Budgeting-app/releases)

Local-first desktop budgeting app with personal and business budget workflows, annual and monthly planning, transaction management, recurring bills, balance sheet tracking, data import/export, and reusable templates.

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
- Beta 1.0 page: https://github.com/josephsandorvoros/Budgeting-app/releases/tag/beta1.0
- Beta 1.0 Windows installer: https://github.com/josephsandorvoros/Budgeting-app/releases/download/beta1.0/Budget%20Ledger-1.0.0-win-x64.exe

## CI Installers

Native multi-platform installer builds are configured in:

.github/workflows/build-installers.yml

Use that workflow to generate Windows, macOS, and Linux artifacts from one repository push.

To publish a beta release from this repository, create and push a tag such as `beta1.0`.

## Notes

- Branding: Budget Ledger
- Frameless Electron window with custom title bar
- Local data-first behavior by design
