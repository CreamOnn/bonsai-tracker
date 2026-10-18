# Setting up your own Bonsai Tracker (Mac)

This guide gets you from nothing to your own copy of the app, running on your phone, with the code on your Mac so you can change it with Claude Code.

**Time:** about 45–60 minutes, once.
**Cost:** free. Nothing here needs a credit card.

> **Using Claude Code?** Open this folder in Claude Code and say *"Set this app up for me"*. Claude follows the playbook in `CLAUDE.md` and walks you through each step below. You'll still do the sign-ins and approvals yourself.

---

## What you'll end up with

| Piece | What it is | Where it lives |
|---|---|---|
| The code | Your own copy of this project | Your GitHub account, and a folder on your Mac |
| The live app | A web app you add to your phone's home screen | `https://<your-github-username>.github.io/bonsai-tracker/` |
| Your data | A Google Sheet plus a photos folder | **Your** Google Drive, in a folder called *Bonsai Tracker* |
| Sign-in | Google sign-in that only you (and people you allow) can use | Your own Google Cloud project |

Nobody else, including whoever shared this template with you, can see your data. The app can only touch the files it creates in your Drive.

---

## Accounts you need

1. **A Google account** (e.g. Gmail). This holds your data and runs the sign-in.
2. **A GitHub account.** It holds your code and hosts the app for free. Sign up at https://github.com/signup if you don't have one.
3. **Claude Code**, if you want to make changes with Claude. You probably have this already.

---

## Step 1 — Install the tools (Terminal)

Open **Terminal** (press Cmd+Space, type *Terminal*, then press Enter) and run these one at a time.

**Homebrew**, the Mac package installer. Skip this if `brew --version` already works:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
It asks for your **Mac login password**. Nothing shows while you type it; that's normal. At the end it may print two *"Next steps"* commands to add Homebrew to your PATH. Run them.

**Node.js, Git and the GitHub command-line tool:**
```bash
brew install node git gh
```

**Check they worked.** Each command should print a version number:
```bash
node --version && git --version && gh --version
```

---

## Step 2 — Your own copy of the code (GitHub)

1. Sign in at https://github.com.
2. Open the template: **https://github.com/CreamOnn/bonsai-tracker**
3. Click the green **Use this template** button, then **Create a new repository**.
4. Set **Repository name** to `bonsai-tracker`. Keeping this exact name is simplest.
5. Choose **Public**. Free GitHub Pages hosting needs a public repo. This only makes the *code* public; your data stays private in your Drive.
6. Click **Create repository**.

**Sign the GitHub tool in on your Mac** (in Terminal):
```bash
gh auth login --hostname github.com --git-protocol https --web
```
- It shows a one-time code and offers to open github.com. Press **Enter**.
- Sign in, paste the code, then click **Continue** and **Authorize GitHub CLI**.
- If it asks *"Authenticate Git with your GitHub credentials?"*, answer **Yes**.
- Back in Terminal you should see **"Logged in as <your-username>"**.

**Download your copy:**
```bash
mkdir -p ~/dev && cd ~/dev
gh repo clone <your-github-username>/bonsai-tracker
cd bonsai-tracker && npm install
```

**Turn on hosting (GitHub Pages):**
```bash
gh api -X POST repos/<your-github-username>/bonsai-tracker/pages -f build_type=workflow
```
If this says Pages already exists, that's fine. You can also do it on the website: repo **Settings → Pages → Source: GitHub Actions**.

---

## Step 3 — Google Cloud project

This gives your app permission to use Google sign-in and to create its own files in your Drive. All of it is done at https://console.cloud.google.com, signed in with **the Google account that will hold your data**.

The first time you visit, Google may ask you to accept its Terms of Service. Read them and accept if you're happy to. You do **not** need to start a free trial or add billing, so ignore those banners.

1. **Create a project.** Go to https://console.cloud.google.com/projectcreate, set **Project name** to `Bonsai Tracker`, then click **Create**. Make sure the project picker at the top shows *Bonsai Tracker* for all the steps below.
2. **Turn on two APIs.** Open each link and click **Enable**:
   - Google Drive API: https://console.cloud.google.com/apis/library/drive.googleapis.com
   - Google Sheets API: https://console.cloud.google.com/apis/library/sheets.googleapis.com
3. **Set up the sign-in screen.** Go to https://console.cloud.google.com/auth/overview, click **Get started**, and fill it in:
   - **App name:** `Bonsai Tracker`. **User support email:** your email. Click **Next**.
   - **Audience:** **External**. Click **Next**.
   - **Contact information:** your email. Click **Next**.
   - Tick the **Google API Services User Data Policy** agreement if you're happy to, then click **Continue** and **Create**.
   - If you get *"brand was created while you were editing"*, refresh the page. It was saved.
4. **Add yourself as a test user.** Go to **Audience** (https://console.cloud.google.com/auth/audience). Under **Test users**, click **＋ Add users**, enter your email, and click **Save**.
   - **Don't** click *Publish app*. Staying in **Testing** keeps the app private to the test users you list (up to 100).
5. **Limit what the app can access.** Go to **Data access** (https://console.cloud.google.com/auth/scopes) and click **Add or remove scopes**. Filter for `drive.file` and tick **only** `.../auth/drive.file`, *"See, edit, create, and delete only the specific Google Drive files you use with this app"*. **Don't** tick the plain `.../auth/drive`. Click **Update**, then **Save**.

---

## Step 4 — Create the app's sign-in ID (OAuth client)

Go to **Clients → Create client** (https://console.cloud.google.com/auth/clients/create):

- **Application type:** Web application
- **Name:** `Bonsai Tracker Web`
- **Authorized JavaScript origins.** Add both:
  - `https://<your-github-username>.github.io` (lowercase, with no path)
  - `http://localhost:5173`
- **Authorized redirect URIs.** Add both, including the final `/`:
  - `https://<your-github-username>.github.io/bonsai-tracker/`
  - `http://localhost:5173/bonsai-tracker/`
- Click **Create**.

Copy the **Client ID**. It ends in `.apps.googleusercontent.com`.
**Ignore the client secret.** The app doesn't use it, so never put it in the code.

Put your Client ID into the code. Open `src/lib/config.ts` and replace the value of `CLIENT_ID` with yours. Or ask Claude: *"Set my Google client ID to …"*.

Google can take **5 minutes or more** to apply new redirect URIs. Until then, sign-in shows `redirect_uri_mismatch`. Wait and try again.

---

## Step 5 — Try it locally, then publish

**Run it on your Mac:**
```bash
npm run dev
```
Open http://localhost:5173/bonsai-tracker/ and click **Continue with Google**:
- Choose your account.
- **"Google hasn't verified this app"** is expected for a private app. Click **Continue**.
- On the permission screen, click **Continue**.

The app creates a **Bonsai Tracker** folder in your Drive containing the data Sheet and a `photos` folder, then opens on Home. Press **Ctrl+C** in Terminal to stop the local server.

**Publish it:**
```bash
git add -A
git commit -m "Use my Google client ID"
git push
```
GitHub builds and publishes it in about a minute. Watch it under the repo's **Actions** tab, or with `gh run watch`. Your app is then live at `https://<your-github-username>.github.io/bonsai-tracker/`.

---

## Step 6 — Put it on your phone

**iPhone (Safari):** open your app link, tap **Share → Add to Home Screen → Add**, and open it from the new icon.
**Android (Chrome):** open your app link, tap **⋮ → Install app** (or **Add to Home screen**), and open it from the new icon.

Sign in the same way as on your Mac. Then start with:
- **＋ → Add tree** and **＋ → Add pot**
- **Settings → Fertilisers:** your usual fertiliser, and a low-phosphorus one for natives
- **Settings → Schedules:** how often each species needs care, and in which windows

---

## Letting someone else use your copy

Add their Google email under **Audience → Test users**. They use your app link and get their **own separate** collection in their own Drive.

---

## Troubleshooting

| What you see | Why | Fix |
|---|---|---|
| `Error 400: redirect_uri_mismatch` | The redirect URIs haven't applied yet, or are mistyped | Wait 5–10 minutes. Check both URIs match exactly, including the final `/`. |
| `Access blocked` / `access_denied` | Your account isn't a test user | Step 3.4: add your email under Test users. |
| Stuck on *"Opening your collection"* | The phone is still using the previous version for a few minutes | Close the app fully and reopen it after about 10 minutes. |
| An update doesn't show on the phone | GitHub caches pages for up to 10 minutes | Wait, then reopen. The app updates itself after that. |
| `npm` or `gh`: *command not found* | Homebrew isn't on your PATH | Run the two *"Next steps"* commands Homebrew printed, or open a new Terminal window. |
| The site shows 404 | Pages isn't on, or the first deploy hasn't finished | Step 2 *Turn on hosting*. Check the **Actions** tab. |

If you renamed the repo to something other than `bonsai-tracker`, use that name everywhere this guide says `bonsai-tracker`, including the redirect URIs. For local development, run `BASE_PATH=/<your-repo-name>/ npm run dev`.
