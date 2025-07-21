# 🥛 DoodhDaily - Smart Milk Tracker

A lightweight, senior-friendly Progressive Web App (PWA) to track daily milk purchases, calculate costs, and get daily reminder notifications — all offline and without Firebase Cloud Messaging.

---

## ✨ Features

### 📅 Calendar Tracking
- Tap any date to mark/unmark milk purchase
- Add optional notes (e.g., "Paid ₹300", "No delivery")
- ★ Highlights Indian holidays (via Calendarific)
- 🧓 Large buttons, text, and icons for elderly usability

### 🧮 Cost Calculator
- Calculates monthly milk cost
- Select months across years
- 1L or 0.5L milk pricing support
- Print-friendly report view

### 🔔 Daily Reminder (No Firebase)
- A local daily reminder at 12:00 PM
- Uses browser Notifications API + Service Worker
- No login or cloud needed
- Clicking the reminder opens the app for manual entry

### 📱 PWA Features
- Install to home screen (Android, iOS, Desktop)
- Works offline with service worker cache
- Optimized for small screens and touch input

---

## 🚀 Quick Start

### 1. Deploy Files
Host all files using Netlify / Firebase Hosting / GitHub Pages:
- `index.html`
- `app.js`
- `style.css`
- `sw.js`
- `manifest.json`
- Icons (`icon-192.png`, `icon-512.png`, etc.)

### 2. Enable Local Notifications
No Firebase needed! The app uses:
- Notifications API (prompted on first visit)
- `setInterval()` + Service Worker scheduling
- Notification triggers once daily at 12:00 PM

---

## 📋 How to Use

### ✅ Mark Milk Purchase
1. Tap any calendar date
2. Confirm "Did you buy milk?" → marks 🥛
3. Optionally add a small note ("Paid ₹250")
4. Re-tap to unmark or update

### 🔔 Daily Notification
- Notification at 12:00 PM daily
- Clicking it opens the app
- No buttons/actions — simple and reliable

### ₹ Cost Calculator
1. Tap `₹` icon
2. Enter cost per litre
3. Choose 1L or 0.5L
4. Select months (can include previous years)
5. View cost breakdown → print/save results

---

## 👓 Senior-Friendly Design

- 🅰️ Minimum font size: 18px
- 🖲️ Large tap targets
- 🌗 Dark/light mode toggle
- 🎯 Clear iconography + feedback (✅, 🥛, ★)

---

## 🧑‍💻 Technical Details

### Browser Support
- ✅ Chrome, Edge (Android/Desktop)
- ✅ Safari (iOS)
- ✅ Firefox (limited install prompt support)

### Data Storage
- `localStorage` → milk data, notes, settings
- `IndexedDB` (optional) → fallback storage
- Offline-capable via service worker

### Notifications
- ✅ One reminder/day using Notifications API
- ❌ No push/Firebase required
- ✅ Opens the app when clicked

---

## 🔒 Privacy & Security

- No personal data is collected
- No login or sign-up needed
- No internet required after first load
- MIT licensed open-source

---

## 📱 Installation Instructions

### Android
1. Open in Chrome
2. Tap “Install DoodhDaily” button or “Add to Home Screen”
3. Confirm → app will appear on home screen

### iOS (Safari)
1. Tap Share → “Add to Home Screen”
2. App icon will appear and launch in full screen

### Desktop
1. Open app in Chrome or Edge
2. Click install icon in address bar

---

## 🔄 Updates

1. Replace hosted files (e.g., via Netlify or Firebase Hosting)
2. Update version in `sw.js` → `CACHE_NAME = 'v2'`
3. Old cache will be cleared automatically

---

## 📂 File Structure
DoodhDaily/
│
├── index.html
├── app.js
├── style.css
├── sw.js
├── manifest.json
├── icon-192.png
├── icon-512.png
├── Title.png
└── image.png


## ❓ Troubleshooting

### No Notification?
- Check if browser allowed notifications
- Try reinstalling the app
- Make sure your browser supports Notification API

### App Not Installing?
- Use Chrome/Edge (Android/Desktop)
- On iOS, open in Safari and "Add to Home Screen"

### Data Lost?
- Avoid using private/incognito mode
- Ensure `localStorage` is enabled
- Data will persist across sessions

---

## ✅ Summary

| Feature         | Available     |
|----------------|---------------|
| Offline Support | ✅ Yes        |
| Daily Reminder  | ✅ Local only |
| Milk Tracker    | ✅ Calendar   |
| Notes per day   | ✅ Yes        |
| Cost Calculator | ✅ Yes        |
| Firebase Needed | ❌ No         |
| Print Logs      | ✅ Yes        |

---

## 🆘 Support

For help or suggestions:
- Check browser console
- Reload app
- Contact developer if issues persist

---

Built with ❤️ for families, seniors, and everyday users who want **simple and reliable milk tracking**.

