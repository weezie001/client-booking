# StratifyHub — Setup Guide

Follow this guide from top to bottom and the platform will be up and running. Each step builds on the last, so don't skip ahead.

---

## Step 1 — Install the Required Programs

You need two programs installed before anything else. Install them in this order.

---

### 1A. Node.js

This is what actually runs the platform.

1. Go to **https://nodejs.org**
2. Click the big **LTS** button on the left
3. Open the downloaded file and click **Next** through everything until it's done
4. To confirm it worked, open **Command Prompt** (search it in the Start menu) and type:
   ```
   node --version
   ```
   You should see something like `v20.11.0`. That means it's installed.

---

### 1B. Git

This is used to download the project files from GitHub.

1. Go to **https://git-scm.com/downloads**
2. Click **Windows**
3. Open the downloaded file and click **Next** through everything — the defaults are fine
4. To confirm it worked, open **Command Prompt** and type:
   ```
   git --version
   ```
   You should see something like `git version 2.44.0`.

---

## Step 2 — Download the Project from GitHub

This pulls all the project files onto your computer.

1. Open **Command Prompt**
2. Go to where you want to save the project. For example, your Desktop:
   ```
   cd Desktop
   ```
3. Download the project by running:
   ```
   git clone https://github.com/YOUR-USERNAME/stratify-hub-platform.git
   ```
   > Replace `YOUR-USERNAME/stratify-hub-platform` with the actual GitHub link you were given.

4. Once it finishes, move into the project folder:
   ```
   cd stratify-hub-platform
   ```
5. Install everything the project needs to run:
   ```
   npm install
   ```
   This takes 1–2 minutes. A lot of text will scroll by — that's normal. Just wait for it to stop.

---

## Step 3 — Set Up Your Settings (.env File)

The `.env` file is where you enter your personal details — payment addresses, email settings, and secret keys. The file is already in the project folder.

Open the project folder in File Explorer, right-click the `.env` file, and open it with **Notepad**.

Go through each section below and fill in your details:

---

### Payment Addresses

Find these lines and replace the placeholder values with your real ones:

```
BTC_ADDRESS=        ← Your Bitcoin wallet address
USDT_ADDRESS=       ← Your USDT (TRC-20) wallet address
CASHAPP_TAG=        ← Your Cash App tag (e.g. $YourName)
VENMO_USERNAME=     ← Your Venmo username (e.g. @YourName)
PAYPAL_EMAIL=       ← Your PayPal email address
```

These are shown to clients on the payment screen when they book.

---

### Admin Email

```
ADMIN_EMAIL=        ← The email address where new booking alerts will be sent
```

Change this to an email you actually check.

---

### Secret Key

```
JWT_SECRET=stratifyhub-super-secret-jwt-key-change-in-production
```

Replace the whole value with any long random phrase — something no one could guess. For example: `mYstr4tify$3cur3k3y!2025`. This keeps user accounts secure.

---

### Email (SendGrid) — Fill in after Step 5

```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=          ← Your SendGrid API key goes here
SMTP_FROM=          ← The email address you verified with SendGrid
```

Leave `SMTP_PASS` and `SMTP_FROM` blank for now. You'll come back and fill these in during Step 5.

---

Save the file when you're done (Ctrl + S).

---

## Step 4 — Run the Platform

You need **two Command Prompt windows** open at the same time — one for the backend and one for the frontend.

---

### Window 1 — Backend (the engine)

In your first Command Prompt window (make sure you're in the project folder), run:

```
node server.js
```

You should see this:

```
✅ Database initialised
🚀 StratifyHub API  →  http://localhost:3001
```

**Leave this window open.** If you close it, the platform stops working.

---

### Window 2 — Frontend (the website)

Open a second Command Prompt window, navigate to the project folder again:

```
cd Desktop\stratify-hub-platform
```

Then run:

```
npm run dev
```

You should see:

```
➜  Local:   http://localhost:5173/
```

**Leave this window open too.**

---

Now open your browser and go to:

**http://localhost:5173**

The platform is live. 🎉

---

## Step 5 — Set Up Email (SendGrid)

SendGrid is the free service that sends all the emails — booking confirmations, payment receipts, reminders, and newsletters.

---

### 5A. Create a Free Account

1. Go to **https://sendgrid.com**
2. Click **Start For Free**
3. Sign up and verify your email

---

### 5B. Verify Your Sender Email

SendGrid needs to confirm you own the email address you'll send from.

1. In the SendGrid dashboard, go to **Settings → Sender Authentication**
2. Click **Get Started** under Single Sender Verification
3. Fill in:
   - **From Name:** StratifyHub
   - **From Email:** the email you want clients to see emails from (e.g. `noreply@yourdomain.com`)
   - Fill in the remaining fields (address, etc.)
4. Click **Create**
5. SendGrid will send a verification email — open it and click **Verify Single Sender**

---

### 5C. Create an API Key

1. In the SendGrid dashboard, go to **Settings → API Keys**
2. Click **Create API Key**
3. Give it any name (e.g. `StratifyHub`)
4. Choose **Restricted Access**
5. Find **Mail Send** in the list and set it to **Full Access**
6. Click **Create & View**
7. **Copy the key that appears** — it starts with `SG.` and is only shown once

---

### 5D. Add It to Your .env File

Open `.env` again and fill in:

```
SMTP_PASS=SG.xxxxxxxxxxxxxxxx    ← paste your API key here
SMTP_FROM=noreply@yourdomain.com ← the email you verified in Step 5B
```

Save the file, then **restart the backend** — stop it with Ctrl + C and run `node server.js` again.

If it worked, you'll now see:

```
✅ Email enabled
```

---

## Step 6 — Set Up the Admin Account

The admin panel lets you manage bookings, talents, blog posts, users, and the newsletter.

1. Go to **http://localhost:5173/auth** and create an account with your email
2. Open a new Command Prompt window in the project folder and run this — replace the email with the one you just used:
   ```
   node -e "import('./init_db.js').then(async({openDb})=>{const db=await openDb();await db.run(\"UPDATE User SET role='admin' WHERE email='your@email.com'\");console.log('Done');await db.close();process.exit(0);})"
   ```
3. Log out of the platform and log back in
4. You'll now see an **Admin Panel** link in the top navigation bar

---

## Step 7 — Sending a Newsletter

1. Go to the Admin Panel → **Newsletter** tab
2. You'll see a list of everyone who subscribed via the website footer
3. Under **Send Newsletter**, click the **"Use Blog Post as Template"** dropdown
4. Pick any blog post — the email subject and body fill in automatically
5. A live preview appears below so you can see exactly what subscribers will receive
6. Edit anything if needed, then click **Send to X Subscribers**

---

## Pulling Updates from GitHub

When updates to the platform are ready, you can download them without re-doing the full setup.

1. Open Command Prompt in the project folder
2. Run:
   ```
   git pull
   ```
3. Then run:
   ```
   npm install
   ```
   (in case any new dependencies were added)
4. Restart both windows (`node server.js` and `npm run dev`)

---

## Troubleshooting

### "Port is already in use" error

Something else is using the same port. Run this to fix it:

```
netstat -ano | findstr :3001
```

Look for the number at the far right (the PID). Then run:

```
taskkill /PID <that number> /F
```

Then try `node server.js` again.

---

### "Cannot find module" error

Run `npm install` and try again.

---

### Emails aren't sending

- Open `.env` and make sure `SMTP_PASS` and `SMTP_FROM` are filled in
- Restart the backend after saving `.env` — it only reads the file at startup
- Log into SendGrid → **Activity Feed** to see if emails were delivered or blocked
- If it says "Invalid sender" — the email in `SMTP_FROM` doesn't match what you verified in SendGrid

---

### Website shows "Failed to load" or is blank

- Make sure the backend is still running in the first Command Prompt window
- If you closed it, just run `node server.js` again

---

### Can't log into the admin panel

Your account doesn't have admin access yet. Go back to **Step 6** and run the command again with your email.

---

### Forgot password isn't sending an email

Email isn't set up yet. Complete Step 5 first. Until then, password resets won't send — but you can still log in normally with your existing password.

---

### The platform worked before but something broke after a git pull

Run `npm install` again — sometimes updates add new packages. Then restart both windows.

---

## Quick Reference

| What you want to do | What to run |
|---|---|
| Start the backend | `node server.js` |
| Start the frontend | `npm run dev` |
| Pull latest updates | `git pull` then `npm install` |
| Open the platform | http://localhost:5173 |
| Open the admin panel | http://localhost:5173/admin |

---

*If something isn't working and you can't find it above, take a screenshot of the error message in the Command Prompt window and send it over.*
