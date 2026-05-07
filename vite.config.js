# Millican Reel Agent — Deploy Guide
### Google Cloud Run · No terminal required

---

## What you're deploying
A web app that:
1. Reads video clips from your Google Drive folder
2. Uses Claude AI to write your hook, captions, and CTA
3. Uses FFmpeg to splice clips and burn in text overlays
4. Exports a finished 9:16 MP4 ready to post to Facebook Reels

---

## One-time setup (~30 minutes)

### Step 1 — Create a Google Cloud account
1. Go to https://console.cloud.google.com
2. Sign in with your Google account
3. Click **"Create Project"** → name it `millican-reel-agent`
4. Enable billing (required for Cloud Run — you'll pay ~$0.01 per render, nothing when idle)

### Step 2 — Enable required APIs
In the GCP Console, go to **APIs & Services → Library** and enable:
- Cloud Run API
- Cloud Build API
- Google Drive API
- Container Registry API

### Step 3 — Create a Service Account for Google Drive access
1. Go to **IAM & Admin → Service Accounts**
2. Click **"+ Create Service Account"**
3. Name it: `reel-agent-drive`
4. Click **"Create and Continue"**
5. Skip roles → click **"Done"**
6. Click the new service account → **"Keys" tab → "Add Key" → "Create new key" → JSON**
7. Save the downloaded `.json` file — you'll need it shortly
8. **Share your Google Drive video folder with the service account email** (it looks like `reel-agent-drive@millican-reel-agent.iam.gserviceaccount.com`) — give it "Viewer" access

### Step 4 — Get your Anthropic API key
1. Go to https://console.anthropic.com
2. Click **API Keys → "Create Key"**
3. Copy the key (starts with `sk-ant-...`)

### Step 5 — Push the code to GitHub
1. Create a free GitHub account at https://github.com if you don't have one
2. Create a new repository named `millican-reel-agent`
3. Upload all files from this folder to the repository
   - Easiest: drag and drop the folder into the GitHub web interface

### Step 6 — Connect Cloud Build to GitHub
1. In GCP Console, go to **Cloud Build → Triggers**
2. Click **"Connect Repository"** → choose GitHub → authorize
3. Select your `millican-reel-agent` repo
4. Click **"Create a Trigger"**:
   - Name: `deploy-reel-agent`
   - Event: Push to branch `main`
   - Configuration: Cloud Build configuration file → `cloudbuild.yaml`

### Step 7 — Set your secret API keys
In **Cloud Build → Triggers**, click your trigger → **"Substitution Variables"** and add:

| Variable | Value |
|---|---|
| `_ANTHROPIC_API_KEY` | your `sk-ant-...` key |
| `_GOOGLE_SERVICE_ACCOUNT_JSON` | paste the entire contents of your `.json` service account file |

### Step 8 — Deploy!
1. In **Cloud Build → Triggers**, click **"Run Trigger"**
2. Watch the build log — takes ~5 minutes
3. When done, go to **Cloud Run → millican-reel-agent**
4. Click the URL at the top — that's your app! 🎉

---

## After deploy

- **Your app URL** will look like: `https://millican-reel-agent-abc123-uc.a.run.app`
- **Cost**: ~$0.00 when idle, ~$0.01–0.05 per render depending on clip length
- **Updates**: Push a new commit to GitHub → Cloud Build auto-redeploys

---

## How to use the app

1. **Paste your Google Drive folder URL** — the folder must be shared with your service account email
2. **Drag clips into order** — the AI will write captions per clip in this order
3. **Type your brand prompt** — describe the reel goal, tone, product, CTA
4. **Click "Generate with Claude"** — hook, captions, and CTA appear instantly
5. **Click "Render Reel"** — takes 2–5 minutes depending on clip length
6. **Download MP4** — post directly to Facebook Reels

---

## Troubleshooting

**"Could not read Drive folder"**
→ Make sure the folder is shared with your service account email (Viewer access)

**FFmpeg error in render**
→ Check that all clips are standard MP4 or MOV files
→ Very large files (>500MB each) may time out — trim clips to under 60s each first

**Build fails in Cloud Build**
→ Make sure all 4 APIs are enabled (Step 2)
→ Check that `_GOOGLE_SERVICE_ACCOUNT_JSON` is pasted as a single line with no line breaks

---

## Questions?
This app was built specifically for Millican Pecan Company.
For updates or new features, bring this codebase back to Claude.
