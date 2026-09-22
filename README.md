# 💈 SmartBarber ET - Ethiopian Barbershop Management & POS System
> **የኢትዮጵያ ፀጉር ቤቶች ዘመናዊ የሂሳብ፣ የኮሚሽን እና የሰልፍ ማስተዳደሪያ ሲስተም**

A commercial-grade, turn-key software system built specifically to address the biggest operational and financial pain points of barbershop owners and barbers in Ethiopia.

---

## 🌟 Why This Product Sells in Ethiopia

1. **Stops Daily Revenue Theft & Disagreements (The #1 Pitch)**
   * In Ethiopia, barbers work on split commissions (50/50, 60/40), and customers pay through a mixture of **Telebirr**, **Cash**, and **CBE Birr**.
   * Owners who are absent from the shop lose 15%–30% of revenue to unrecorded cuts or cash pocketing.
   * **SmartBarber** reconciles every single cut. If a barber receives cash directly from a customer, the system deducts it from his evening payout automatically. The owner knows down to the exact Birr who owes who at 9:00 PM.

2. **58mm / 80mm Thermal Receipt Generator with Telebirr QR**
   * Instant receipt printing formatted for standard POS thermal receipt printers.
   * Features dynamic Telebirr payment QR codes and merchant account details.

3. **Live Queue & Virtual Waiting Line (Telegram Mini App Ready)**
   * Friday–Sunday lines in Addis Ababa barbershops are notoriously long.
   * Customers scan a counter QR code or open a Telegram bot to take a virtual ticket (`#T-106`), check live chair status, and see estimated wait times in minutes without having to sit in a crowded waiting area.

4. **Automated Telegram Daily Close Report**
   * At shift close, the system generates a formatted Telegram report ready to copy or push to the owner's Telegram with full revenue breakdown, Telebirr vs. cash totals, and individual barber settlement instructions.

5. **Full English & Amharic (አማርኛ) Bilingual Interface**
   * One-click toggle between English and Amharic across all screens so cashiers and barbers can navigate comfortably.

---

## 🚀 Quick Start (Running the System)

### Option 1: 1-Click Windows Launcher
Double-click `run.bat` in the project root directory:
```powershell
.\run.bat
```
This automatically launches the server and opens `http://localhost:5000` in your default browser.

### Option 2: Command Line
```powershell
npm start
```
Open **[http://localhost:5000](http://localhost:5000)** in your browser or tablet.

### Development Mode (with Live Reloading)
```powershell
# Terminal 1: Backend
cd server
node src/index.js

# Terminal 2: Frontend (Vite)
cd client
npm run dev
```

---

## 📱 Modules Included

| Screen / Module | Target User | Key Capabilities |
| :--- | :--- | :--- |
| **🛒 Cashier POS** | Cashier / Receptionist | Fast 2-tap cut entry, barber chair selection, Telebirr/Cash/CBE payment modes, tip tracking, 58mm thermal receipt modal with QR code. |
| **⏳ Live Queue & Booking** | Customers / Desk Display | Mobile & Telegram Mini App optimized live waiting board, virtual ticket creation, countdown wait times, customer call-to-chair. |
| **✂️ Barber Portal** | Individual Barbers | Smartphone portal for each barber showing completed cuts, daily commission earned, tips, cash held in pocket, and net payout balance. |
| **📊 Owner Settlement** | Shop Owner / Manager | Daily revenue summary, Telebirr vs Cash reconciliation, automated dispute-free barber payout instructions, shift locking, and Telegram report export. |

---

## 💼 Commercialization & Inquiries

For custom deployments, commercial licensing, hardware bundles (POS tablets & thermal receipt printers), or partnership inquiries, please communicate directly with the developers:

- **Contact Developers:** Reach out directly or open an inquiry/issue in this repository.

---

## 🛠️ Tech Stack
* **Frontend:** React 18, Vite, Tailwind CSS v4, Lucide Icons, Canvas Confetti, QRCode.
* **Backend:** Node.js, Express.
* **Database:** SQLite (`better-sqlite3`) — self-contained, zero-configuration, zero cloud dependency required for local shop offline reliability.
* **Localization:** English & Amharic (አማርኛ).
