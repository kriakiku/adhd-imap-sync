# 📬⚡ ADHD IMAP Sync

<!-- VERSIONS -->
![Project](https://img.shields.io/badge/Project-v1.1.0-blue) ![GoIMAPNotify](https://img.shields.io/badge/GoIMAPNotify-v2.5.3-green) ![FetchMail](https://img.shields.io/badge/FetchMail-v6.5.4-green)
<!-- /VERSIONS -->

**ADHD IMAP Sync** is a lightweight Alpine-based container that combines [goimapnotify](https://github.com/shackra/goimapnotify) and [fetchmail](https://www.fetchmail.info/) to instantly process incoming mail and deliver it to your local MDA (LMTP/SMTP, etc.).

The idea is simple: IMAP IDLE via `goimapnotify` detects new mail and immediately wakes up `fetchmail` to retrieve and deliver it locally. 📬⚡


---

## ✨ Features

- 📨 Instant trigger on new messages (IMAP IDLE)
- 🛠️ Support for unlimited mail accounts
- 📂 Configuration via environment variables or Docker secrets
- 🔄 Auto-regenerated configs on container restart
- 🔐 Passwords via `_FILE` support
- 🛎️ Flexible delivery: LMTP (TCP/UNIX), SMTP, or custom commands


---

## 🚀 Quick Start

Example `compose.yml`:

```yaml
services:
  adhd-imap-sync:
    image: ghcr.io/kriakiku/adhd-imap-sync:latest
    container_name: adhd-imap-sync
    restart: unless-stopped
    secrets:
      - imap_work_pass
    volumes:
      - ./data:/config
    environment:
      TZ: UTC
      PUID: "1000"
      PGID: "1000"

      # Default settings
      ADHD_IMAP_HOST: "imap.example.com"
      ADHD_DELIVERY_TARGET: |
        mda "/usr/bin/maildrop -d %T"

      # Default account (no suffix)
      ADHD_IMAP_USER: "user@example.com"
      ADHD_IMAP_PASS: "SECRET1"
      
      # Extra account with "WORK" suffix 
      ADHD_IMAP_USER_WORK: "work@example.com"
      ADHD_IMAP_PASS_FILE_WORK: "/run/secrets/imap_work_pass"
      ADHD_DELIVERY_TARGET_WORK: |
        lmtp
        smtpname "work@target.com"
        smtphost /var/run/dovecot/lmtp
        # smtphost dovecot/24
secrets:
  imap_work_pass:
    file: ./imap_work_pass.txt
```


---

## 🔧 Environment Variables

| Variable | Default | Description | Example |
|----------|---------|-------------|---------|
| `ADHD_IMAP_HOST` | *(none)* | IMAP server hostname | `imap.example.com` |
| `ADHD_IMAP_PORT` | `993` | IMAP port | `143` |
| `ADHD_IMAP_TLS` | `true` | Use SSL/TLS for IMAP (`true` or `false`) | `false` |
| `ADHD_IMAP_USER` | *(none)* | IMAP username | `user@example.com` |
| `ADHD_IMAP_PASS` | *(none)* | IMAP password (or use `_FILE`) | `secret` |
| `ADHD_IMAP_PASS_FILE` | *(none)* | Path to file containing IMAP password | `/run/secrets/imap_work_pass` |
| `ADHD_DELIVERY_TARGET` | *(none)* | Fetch mail config part (LMTP/SMTP/MDA) | `mda "/usr/bin/maildrop -d %T"`  |
| `ADHD_POLL_INTERVAL` | `300` | Fetchmail polling interval in seconds | `60` |
| `ADHD_WAKE_MIN` | `3` | Minimum delay in seconds between wake-up signals | `5` |
| `ADHD_KEEP` | `keep` | Whether to leave messages on the server (`keep` or `no keep`) | `no keep` |


---

### Multiple Accounts

You can define multiple mail accounts by appending a **suffix** (e.g., `_WORK`, `_ME`, `_GMAIL`) to the variable names.  
Each suffix will be treated as a separate account, with its own configuration.  
If a variable is not set for a suffix, it will fall back to the **default account** values (without a suffix).

**Account Name Generation:**
- If suffix is empty → account name is `"default"`.
- If suffix exists → account name is the suffix in lowercase (e.g., `_WORK_UA` → `"work_ua"`).

**Example with multiple accounts:**
```env
# Default account
ADHD_IMAP_HOST=imap.example.com
ADHD_IMAP_USER=user@example.com
ADHD_IMAP_PASS=secret

# Work account
ADHD_IMAP_HOST_WORK=imap.work.com
ADHD_IMAP_USER_WORK=me@work.com
ADHD_IMAP_PASS_FILE_WORK=/run/secrets/imap_work_pass
```


---

## 📂 Configuration Files


Fetchmail stores the identifiers of processed messages in the file `/config/.fetchids` (used via the `--idfile /config/.fetchids` option).  
This file ensures that already retrieved emails are not processed again after container restarts.  
You can mount a persistent volume to `/config` to preserve this state:

```yaml
volumes:
  - ./data:/config
```

You can provide a `.netrc` file for authentication either by mounting it as `/config/.netrc`.  

---

## 📦 How It Works

1. goimapnotify connects to IMAP and listens for new mail using IDLE.
2. When a new message arrives, it calls /usr/local/bin/fetchmail-wakeup.
3. fetchmail retrieves messages and delivers them to the configured ADHD_DELIVERY_TARGET.


---

## 💡 Motivation  

I run a self-hosted mail server (**Stalwart**) on my home server. But home servers aren’t exactly the most stable environment — in the last 3 years I had to move 5 times (thanks to one deranged dictator), and sometimes there are internet outages.

To keep my email reliable, I use **MXroute** for both sending and receiving. Stalwart lets me use external SMTP servers to send mail, but I couldn’t find a way to **pull mail from external inboxes** (would be hilarious if it actually exists 😅).  

So, I turned to **Fetchmail** — but here’s the catch: it doesn’t support **IMAP IDLE** (push notifications for new mail). Instead, it just polls every few minutes. Not good enough — I want my OTP codes instantly ⚡📲.  

That’s when I found **GoIMAPNotify**, which *does* support IMAP IDLE and can trigger commands when new mail arrives. Perfect match! So I built a **Docker image** that automatically generates configs for both tools and makes them work together.  

Maybe someone else finds this handy too. 🙂


---

## 📝 TODO

- [ ] Add `tlsOptions` support for `goimapnotify`:
  - `unauthorized` flag (allow self-signed certs)
  - `starttls` support
- [ ] Add per-account mailbox selection support (currently all mailboxes are monitored)
