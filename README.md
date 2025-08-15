# 📬⚡ ADHD IMAP Sync

<!-- VERSIONS -->
![Project](https://img.shields.io/badge/Project-v0.1.1-blue) ![GoIMAPNotify](https://img.shields.io/badge/GoIMAPNotify-v2.5.3-green) ![FetchMail](https://img.shields.io/badge/FetchMail-v6.5.4-green)
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
      ADHD_DELIVERY_TARGET: "smtp://dovecot:25"

      # Default account (no suffix)
      ADHD_IMAP_USER: "user@example.com"
      ADHD_IMAP_PASS: "SECRET1"
      
      # Extra account with "WORK" suffix 
      ADHD_IMAP_USER_WORK: "meow@example.com"
      ADHD_IMAP_PASS_FILE_WORK: "/run/secrets/imap_work_pass"
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
| `ADHD_DELIVERY_TARGET` | *(none)* | Full URI for message delivery (LMTP/SMTP/custom) | `lmtp://127.0.0.1:24` |
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
ADHD_DELIVERY_TARGET=lmtp://127.0.0.1:24

# Work account
ADHD_IMAP_HOST_WORK=imap.work.com
ADHD_IMAP_USER_WORK=me@work.com
ADHD_IMAP_PASS_FILE_WORK=/run/secrets/imap_work_pass
ADHD_DELIVERY_TARGET_WORK=smtp://mail.local:25
```

---

## 📦 How It Works

1. goimapnotify connects to IMAP and listens for new mail using IDLE.
2. When a new message arrives, it calls /usr/local/bin/fetchmail-wakeup.
3. fetchmail retrieves messages and delivers them to the configured ADHD_DELIVERY_TARGET.


---

## 🧠 Why “ADHD”?

Because I’m like a caffeinated squirrel when it comes to new emails — I want them now! 🐿️📬⚡


---

## 📝 TODO

- [ ] Add `tlsOptions` support for `goimapnotify`:
  - `unauthorized` flag (allow self-signed certs)
  - `starttls` support
- [ ] Add per-account mailbox selection support (currently all mailboxes are monitored)
