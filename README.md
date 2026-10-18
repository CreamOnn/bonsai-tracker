# Bonsai Tracker

A minimal, Japanese-inspired phone app for tracking your bonsai **trees**, **pots** and **care**: photos over time, fertilising, pruning and spraying history, seasonal schedules, what's due today, and phosphorus-sensitive natives. It installs to your home screen from the browser (iPhone or Android). Your data and photos live privately in **your own Google Drive**.

## Get your own copy

This repository is a **template**. Click **Use this template → Create a new repository**, then follow **[docs/SETUP.md](docs/SETUP.md)** (Mac, about 45–60 minutes, free).

Using **Claude Code**? Open your copy and say *"Set this app up for me"*. [CLAUDE.md](CLAUDE.md) gives Claude a step-by-step setup playbook, plus everything it needs to change the app safely afterwards.

## Docs

- [docs/SETUP.md](docs/SETUP.md): accounts, sign-ins, Google Cloud, hosting, phone install
- [docs/SPEC.md](docs/SPEC.md): how the app behaves, and why
- [docs/GOOGLE_SETUP.md](docs/GOOGLE_SETUP.md): a record to fill in for your own Google setup
- [CLAUDE.md](CLAUDE.md): architecture and working notes for Claude Code

## Develop

```bash
npm install
npm run dev     # http://localhost:5173/bonsai-tracker/
npm run check   # type-check
```

Pushing to `main` deploys to GitHub Pages.
