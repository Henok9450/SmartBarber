# 💈 SmartBarber ET - Complete Deployment & Onboarding Manual

A comprehensive step-by-step guide to deploying, configuring, and operating **SmartBarber ET** for a new barbershop branch or client.

---

## 📋 Table of Contents
1. [System Prerequisites & Equipment Requirements](#1-system-prerequisites--equipment-requirements)
2. [Deployment Architectures (Offline-First vs Cloud)](#2-deployment-architectures)
3. [Step-by-Step Installation Guide (5 Minutes)](#3-step-by-step-installation-guide)
4. [Auto-Start Configuration (Runs on Boot)](#4-auto-start-configuration)
5. [New Barbershop Onboarding & Initial Configuration](#5-new-barbershop-onboarding--initial-configuration)
6. [58mm Thermal Receipt Printer Setup](#6-58mm-thermal-receipt-printer-setup)
7. [Daily Shop Operations (Morning to Shift Close)](#7-daily-shop-operations)
8. [Database Backup & Disaster Recovery](#8-database-backup--disaster-recovery)

---

## 1. System Prerequisites & Equipment Requirements

### A. Reception Desk Hardware
| Equipment | Specification / Recommendation | Purpose |
| :--- | :--- | :--- |
| **Main POS Computer** | Any PC, laptop, or mini-PC (Windows 10/11, macOS, or Ubuntu). Minimum 4GB RAM, Core i3 or equivalent. | Acts as both the Reception Cashier POS and the local in-shop server. |
| **Receipt Printer** | Standard **58mm Thermal Receipt Printer** (USB or Bluetooth). Brands: Xprinter, POS-58, Epson, Rongta, etc. | Prints customer 58mm receipts with Telebirr QR code, barber details, and prices. |
| **Wi-Fi Router** | Any standard 2.4GHz / 5GHz Wi-Fi router in the shop. | Connects barber smartphones and customer queue screen to the cashier server. |
| **Thermal Paper** | Standard 57mm × 30mm or 57mm × 50mm thermal paper rolls (readily available in Merkato / stationery shops). | Consumable receipt paper. |
| **Barcode / QR Scanner** *(Optional)* | 2D USB barcode/QR scanner. | Quickly scans customer turn tickets or Telebirr transaction confirmation SMS. |
| **Shop TV / Monitor** *(Optional)* | Any Smart TV or HDMI monitor on the wall. | Displays the Live Queue Desk (`/queue`) so customers see their waiting turns. |

### B. Staff Devices
- **Barbers**: Any smartphone (Android or iPhone). Barbers connect to the shop Wi-Fi and open the web browser to access their personal **Barber Cut Sheet & Daily Payouts Portal** (`/barber`).
- **Owner**: Smartphone, tablet, or home laptop to view daily reports, shift settlements, and Telegram bot summaries.

### C. Software Requirements
- **Node.js**: Version 18.x, 20.x, or newer ([Download Node.js LTS](https://nodejs.org)).
- **Web Browser**: Google Chrome, Microsoft Edge, or Safari (Chrome recommended for ESC/POS thermal printing).
- **Zero External Database Server Needed**: The system uses a fast, self-contained embedded SQLite database (`smartbarber.db`). No PostgreSQL, MySQL, or cloud database setup required!

---

## 2. Deployment Architectures

### Option A: Local In-Shop Server (Recommended for Ethiopian Barbershops)
```
                ┌─────────────────────────────────────────┐
                │        Reception Desk Computer          │
                │    (Runs SmartBarber Server + POS)      │
                │        IP: 192.168.1.100:5000           │
                └────────────────────┬────────────────────┘
                                     │
                 Local Shop Wi-Fi Router (No Internet Needed!)
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         ▼                           ▼                           ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│   Barber Phone   │       │  Wall Display TV │       │  Customer Phone  │
│  (Barber Portal) │       │   (Live Queue)   │       │  (Track My Turn) │
│ 192.168.1.100:5000       │ 192.168.1.100:5000       │ 192.168.1.100:5000
└──────────────────┘       └──────────────────┘       └──────────────────┘
```
- **100% Offline-Resilient**: If Ethio Telecom or the local ISP experiences an outage, checkout, receipt printing, queue management, and barber commission calculation continue operating without a second of downtime.
- **Fast & Zero Monthly Cloud Costs**: Everything stays within the shop's local network.

### Option B: Cloud VPS (Alternative)
- Host on DigitalOcean, Linode, AWS, or local Ethiopian cloud provider (e.g. WebSprix / Ethio Telecom Cloud).
- Accessible via a public domain with HTTPS (e.g., `https://pos.mybarbershop.et`).

---

## 3. Step-by-Step Installation Guide

Follow these steps on the main Reception Computer:

### Step 1: Install Node.js
1. Download and install **Node.js LTS (v20+)** from [nodejs.org](https://nodejs.org).
2. Open PowerShell or Command Prompt and verify:
   ```bash
   node -v
   npm -v
   ```

### Step 2: Copy the SmartBarber Project
Place the `SmartBarber` folder in a permanent location on the computer, e.g.:
`C:\SmartBarber` or `D:\SmartBarber`.

### Step 3: Install Dependencies
Open terminal/PowerShell in `C:\SmartBarber`:
```bash
# 1. Install root dependencies
npm install

# 2. Install server dependencies
cd server
npm install

# 3. Install client frontend dependencies
cd ../client
npm install
```

### Step 4: Build Production Frontend
Inside `client/`, compile the optimized React frontend:
```bash
npm run build
```
*(This builds all assets into `client/dist`, which the Express server serves automatically).*

### Step 5: Start the Server
Go back to the root directory and start the server:
```bash
cd ..
npm start
```
You will see:
```
💈 SmartBarber Server listening on http://localhost:5000
```
Open **`http://localhost:5000`** in your browser to verify the system is running!

---

## 4. Auto-Start Configuration (Runs on PC Boot)

Ensure the system starts automatically whenever the computer is turned on or rebooted.

### On Windows (Recommended: PM2)
1. Install PM2 globally:
   ```bash
   npm install -g pm2
   npm install -g pm2-windows-startup
   ```
2. Start SmartBarber with PM2:
   ```bash
   cd C:\SmartBarber
   pm2 start server/src/index.js --name "smartbarber"
   ```
3. Configure PM2 to auto-start on Windows boot:
   ```bash
   pm2-startup install
   pm2 save
   ```

### Shortcut Method (Without PM2)
Create a batch file `start_smartbarber.bat`:
```bat
@echo off
cd C:\SmartBarber
node server/src/index.js
```
Press `Win + R`, type `shell:startup`, and place a shortcut to `start_smartbarber.bat` in that folder.

---

## 5. New Barbershop Onboarding & Initial Configuration

Once the application is running, perform the **First 15 Minutes Setup** as the Shop Owner:

```
[Step 1: Change Master PIN] ──► [Step 2: Shop Branding] ──► [Step 3: Register Barbers] ──► [Step 4: Register Services]
```

### Step 1: Log in as Shop Owner
1. Go to `http://localhost:5000`.
2. Click the Role Switcher pill in the top-right corner.
3. Select **"Shop Owner"** (Default PIN: **`1234`**).
4. Click **"Owner Management"** and enter PIN **`1234`**.
5. Go to the Staff list or Change PIN modal and **change the default Owner PIN** immediately to a secure private 4-digit code.

### Step 2: Configure Shop Profile & Branding
Click the **"🏢 Shop Profile & Branding"** tab in Owner Management:
- **Shop Logo**: Select an icon (✂️, 💈, 👑, ✨, 🛡️, 🪒) or upload the shop's official logo image.
- **Shop Name**: Enter English and Amharic names (e.g., `Vintage Executive Barbershop` / `ቪንቴጅ ኤክስኪዩቲቭ ባርበር`).
- **Branch Name**: e.g., `Bole Medhanialem Branch` / `ቦሌ መድኃኒዓለም ቅርንጫፍ`.
- **Physical Address**: e.g., `Cameroon St, Next to Edna Mall, Bole, Addis Ababa`.
- **Phone Number**: Shop reception phone for receipts.
- Click **"Save & Apply Shop Branding"** — the logo, name, and branch will update live across all screens!

### Step 3: Configure Telebirr & CBE Payment Details
In Settings or Receipt setup, enter:
- **Telebirr Merchant Code / Phone**: Automatically encoded into the customer receipt QR code.
- **CBE Account Number**: Displayed on customer checkout for quick bank transfer verification.

### Step 4: Register Barbers (Chairs & Commission Splits)
In Owner Management, select **"Manage Barbers"**:
1. Click **"+ Add New Barber"**.
2. Enter:
   - Barber Name (English & Amharic)
   - Phone Number
   - Chair Number (e.g., Chair 1, Chair 2, Chair 3...)
   - Commission Split % (e.g., `0.50` for 50/50, `0.60` for 60/40)
3. Click **"Save Barber Details"**.
   > *Note: An RBAC account is created for each barber automatically with default PIN `1234`.*

### Step 5: Register Services & Pricing
In Owner Management, select **"Manage Services & Pricing"**:
1. Click **"+ Add New Service"**.
2. Configure services by category:
   - **Haircuts**: Standard Haircut, Fade, Shave & Trim, Beard Sculpting.
   - **Facial / Spa**: Facial Steam, Black Mask, Hot Towel Massage.
   - **Combos**: VIP Full Package (Cut + Beard + Facial).
   - **Retail Products**: Hair wax, pomade, beard oil.
3. Set price (ETB), estimated duration (minutes), and commission rate.
4. Click **"Save Service"**.

---

## 6. 58mm Thermal Receipt Printer Setup

### Step 1: Connect Printer to Reception PC
1. Connect the 58mm printer via USB cable or Bluetooth.
2. Install the printer's driver (POS-58 driver or Generic / Text-Only driver).
3. In Windows Settings, set the 58mm printer as Default (or remember its name).

### Step 2: Configure Chrome / Edge Print Dialog (Zero-Click Printing)
1. In SmartBarber POS, complete a test ticket and click **"Complete & Print Receipt"**.
2. When the print preview appears:
   - Destination: Select your **58mm Thermal Printer**.
   - Paper Size: Select **58mm × 210mm** or **Roll Paper 58mm**.
   - Margins: **None** (or Minimum).
   - Options: Uncheck **"Headers and Footers"**.
3. *Tip for 1-Click Fast Printing:* Add `--kiosk-printing` to the Chrome desktop shortcut target to bypass the print confirmation dialog entirely.

---

## 7. Daily Shop Operations

### ☀️ Morning (Shift Opening)
1. Cashier logs in at reception (`PIN: 2222`).
2. Cashier verifies the physical cash float in the drawer.
3. Checks the top banner: **System Date**, **Live Clock**, and **Branch Name**.
4. Barbers check into their chairs (status turns `Available / Ready`).

### ✂️ Throughout the Day (Serving Customers)
1. **Walk-ins & Queue**:
   - Cashier or queue desk calls customer to chair (`Call to Chair`).
   - Chair status turns `Busy`.
2. **Checkout & Receipts**:
   - Cashier selects Barber, Services, and Payment Method (Telebirr QR, Cash, CBE Birr, Card).
   - If the customer gave a Tip, cashier enters the tip amount (attributed directly to that specific barber).
   - Cashier clicks **"Complete & Print Receipt"**.
   - 58mm thermal receipt prints with Telebirr QR and breakdown.
3. **Mid-Shift Check**:
   - Cashier clicks **"📋 Daily Balance & Telegram Report"** at any time to verify register cash, Telebirr total, and CBE Birr totals.

### 🌙 Evening (Shift Closing & Settlement)
1. Open **"Daily Reconciliation"** (`/reconciliation` or via POS top button).
2. **Channel Reconciliation**:
   - Count physical cash drawer against **Cash in Register Drawer**.
   - Check Telebirr merchant SMS against **Telebirr Total**.
   - Check CBE mobile banking against **CBE Birr Total**.
3. **Barber Settlements**:
   - Review the Barber Settlement Table: Each barber's cut count, total volume, commission earned, client tips collected, and final **"Pay to Barber"** amount (`Commission + Tips`).
   - Cashier/Owner pays each barber their due payout from the cashier balance.
4. **Send Telegram Report to Owner**:
   - Click **"📱 Telegram Report for Owner"**.
   - Click **"Copy Message"** or **"Open Telegram"** to send the daily financial report directly to the owner.
5. **Close Day Shift**:
   - Click **"Close Day Shift"** (`የቀኑን ፈረቃ ዝጋ`) to finalize and lock today's ledger.

---

## 8. Database Backup & Disaster Recovery

Because SmartBarber ET uses an embedded SQLite database, backing up the entire business is as simple as copying a single file:

### Database Location:
`C:\SmartBarber\server\src\database\smartbarber.db`

### 1-Click Manual Backup
Copy `smartbarber.db` to a USB drive, external hard drive, or Telegram/cloud storage.

### Automated Daily Backup Script (Windows Task Scheduler)
Create a script `backup_smartbarber.bat`:
```bat
@echo off
set BACKUP_DIR=D:\SmartBarber_Backups
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
set DATESTAMP=%date:~10,4%%date:~4,2%%date:~7,2%
copy "C:\SmartBarber\server\src\database\smartbarber.db" "%BACKUP_DIR%\smartbarber_%DATESTAMP%.db"
echo Backup completed: %BACKUP_DIR%\smartbarber_%DATESTAMP%.db
```
Schedule this batch file in Windows Task Scheduler to run every night at 11:00 PM.

---

## 📞 Support & Default Credentials Reference

| Role | Username | Default PIN | Permissions |
| :--- | :--- | :--- | :--- |
| **👑 Shop Owner** | `owner` | **`1234`** *(Change on Day 1)* | Full control: branding, pricing, barber rates, PIN resets, analytics, shift closing. |
| **💳 Reception Cashier** | `cashier` | **`2222`** | POS ticket checkout, thermal receipts, queue management, daily balance, telegram report. |
| **✂️ Barber Staff** | Auto-created | **`1234`** | Barber cut sheet, commission & tip tracking, assigned queue. |
| **📱 Customer** | `guest` | *None* | Live queue turn tracking (`/queue`). |

*SmartBarber ET is ready for commercial production deployment across Ethiopia!*
