# Budget Ledger

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

Windows installer (.exe):

npm run dist:win

macOS installer (.dmg, run on macOS or CI):

npm run dist:mac

Linux installer (.AppImage, run on Linux or CI):

npm run dist:linux

Artifacts are written to the release folder.

## CI Installers

Native multi-platform installer builds are configured in:

.github/workflows/build-installers.yml

Use that workflow to generate Windows, macOS, and Linux artifacts from one repository push.

## Notes

- Branding: Budget Ledger
- Frameless Electron window with custom title bar
- Local data-first behavior by design
