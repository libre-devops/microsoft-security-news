# 🛡️ Microsoft Security News

A lightweight Microsoft security intelligence aggregator that collects public Microsoft security content into a single searchable feed.

Built for security engineers, defenders, cloud architects, SOC analysts, and anyone who got tired of checking a dozen Microsoft blogs manually.

**Live site:** https://security.libredevops.org

**RSS feed:** https://security.libredevops.org/data/feed.xml

---

## Features

- 📰 **Aggregated Microsoft security intelligence**
  Collects Microsoft security content from official public feeds including:

  - Microsoft Security Blog
  - Microsoft Security Response Center
  - Microsoft Threat Intelligence
  - Microsoft Sentinel
  - Microsoft Defender XDR
  - Microsoft Defender for Endpoint
  - Microsoft Defender for Identity
  - Microsoft Defender for Office 365
  - Microsoft Defender for Cloud
  - Microsoft Security Copilot
  - Microsoft Purview
  - Microsoft AI Blog
  - Azure Network Security
  - Core Infrastructure & Security

- 🔍 **Fast search**
  Search across article titles, summaries, sources, and tagged products

- 🏷️ **Dynamic product categorisation**
  Automatically classifies articles into:

  - Microsoft Sentinel
  - Microsoft Defender XDR
  - Microsoft Defender for Endpoint
  - Microsoft Defender for Identity
  - Microsoft Defender for Office 365
  - Microsoft Defender for Cloud
  - Microsoft Security Copilot
  - Microsoft Purview
  - Threat Intelligence
  - AI Security
  - General Security

- ⭐ **Bookmarks**
  Save articles locally in browser storage

- 🌙 **Theme support**
  Dark mode and light mode support

- 📱 **Responsive design**
  Desktop, tablet, and mobile support

- 📡 **RSS feed support**
  Subscribe externally:

  ```text
  https://security.libredevops.org/data/feed.xml
  ```

- ⚡ **Progressive Web App**
  Installable application with service worker caching

- 🤖 **Automated updates**
  GitHub Actions refreshes content every 6 hours

- 📊 **Pipeline observability**
  Tracks:

  - feed changes
  - newly added articles
  - removed articles
  - duplicate removal
  - retention filtering

- 🔐 **Hosted securely**
  GitHub Pages with custom domain and HTTPS

---

## Architecture

```text
Microsoft RSS / Atom Feeds
          ↓
Python Feed Aggregator
          ↓
Normalisation
Classification
Deduplication
Retention Filtering
Diff Analysis
          ↓
feeds.json + RSS XML
          ↓
GitHub Actions CI/CD
          ↓
GitHub Pages
          ↓
Frontend (Vanilla JS + PWA)
```

---

## Source Coverage

### Core Microsoft Security
- Microsoft Security Blog
- Microsoft Security Response Center (MSRC)
- Microsoft Threat Intelligence

### Defender Ecosystem
- Microsoft Defender XDR
- Microsoft Defender for Endpoint
- Microsoft Defender for Identity
- Microsoft Defender for Office 365
- Microsoft Defender for Cloud

### Security Operations
- Microsoft Sentinel
- Core Infrastructure & Security
- Azure Network Security

### AI / Data Security
- Microsoft Security Copilot
- Microsoft Purview
- Microsoft AI Blog

---

## Local Development

Install dependencies:

```bash
pip install -r scripts/requirements.txt
```

Generate feed data:

```bash
python scripts/fetch_feeds.py
```

Serve locally:

```bash
python -m http.server 8000
```

Browse:

```text
http://localhost:8000
```

---

## Deployment

Deployment is fully automated via GitHub Actions.

Refresh cadence:

```text
Every 6 hours (UTC)
```

Cron schedule:

```yaml
0 */6 * * *
```

Pipeline workflow:

1. Fetch public Microsoft security feeds
2. Normalise feed content
3. Apply product classification
4. Deduplicate articles
5. Remove content older than retention threshold
6. Compare against previous feed state
7. Generate:
   - `data/feeds.json`
   - `data/feed.xml`
8. Publish static site to GitHub Pages

---

## Setup

### Create repository

```bash
gh repo create microsoft-security-news --public --source=. --remote=origin
```

### Push code

```bash
git init
git add .
git commit -m "Initial commit"
git push -u origin master
```

### Configure GitHub Pages

Repository settings:

```text
Settings → Pages
```

Deployment source:

```text
GitHub Actions
```

### Configure custom domain

Set:

```text
security.libredevops.org
```

DNS:

```dns
CNAME security libre-devops.github.io
```

Wait for GitHub TLS provisioning.

### Initial run

Run workflow manually:

```text
Actions → Update Microsoft Security News Feed → Run workflow
```

---

## Technology Stack

- Python 3.14
- feedparser
- GitHub Actions
- GitHub Pages
- Vanilla JavaScript
- HTML5 / CSS3
- Progressive Web App
- Service Worker caching

---

## Roadmap

Potential future improvements:

- [ ] Additional Microsoft security sources
- [ ] Smarter advisory ingestion
- [ ] Severity-based MSRC filtering
- [ ] Microsoft 365 roadmap integration
- [ ] Public Microsoft service health feeds
- [ ] Optional vendor expansion
  - AWS
  - Google Cloud
  - Palo Alto
  - CrowdStrike
- [ ] Threat campaign highlighting
- [ ] Digest / summary mode
- [ ] Email subscriptions
- [ ] Internal tenant integrations (private mode)

---

## Inspiration / Attribution

Project concept inspired by Ricardo Martins’ excellent Azure feed aggregator:

https://azurefeed.news

---

## License

MIT