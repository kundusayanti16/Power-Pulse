# ⚡ Power-Pulse: Smart Electricity Management System

A premium, full-stack digital infrastructure solution for electricity consumer complaint management and real-time grid monitoring. Built with a high-performance **Node.js/Express** backend and a stunning glassmorphic frontend.

---

## 🚀 Deployment Guide

### 1. GitHub (Source Control)
1. Initialize a git repository: `git init`
2. Add all files: `git add .`
3. Commit: `git commit -m "Initial commit"`
4. Push to your GitHub repository.

### 2. Backend (Render)
1. Log in to [Render](https://render.com/).
2. Click **New +** > **Blueprint**.
3. Connect your GitHub repository.
4. Render will automatically detect `render.yaml` and set up the `power-pulse-backend`.
5. In the Render Dashboard, go to your service > **Environment** and add the following keys from your `backend/.env`:
   - `MONGO_URI`
   - `JWT_SECRET`
   - `EMAIL_USER`: Your Gmail address.
   - `EMAIL_PASS`: A 16-character **Google App Password** (not your regular password).
   - `CLIENT_URL`: Set this to your Vercel URL once deployed.

#### 📧 How to get `EMAIL_PASS`:
1. Enable **2-Step Verification** on your Gmail account.
2. Search for **"App passwords"** in Google Account settings.
3. Generate a password for "Other (PowerPulse)" and copy the 16-character code.

### 3. Frontend (Vercel)
1. Log in to [Vercel](https://vercel.com/).
2. Click **Add New** > **Project**.
3. Import your GitHub repository.
4. Set the **Root Directory** to `frontend`.
5. Click **Deploy**.
6. Once deployed, copy your Vercel URL and:
   - Update `CLIENT_URL` in your Render Backend environment variables.
   - Update `API_BASE` in `frontend/js/utils.js` (if it's different from the default).

---

## ✨ Key Features

### 🏢 Admin Command Center
- **🛰️ Live Outage Map**: Interactive Leaflet.js map plotting complaints in real-time.
- **📊 Advanced Analytics**: Dynamic Chart.js visualizations for problem categories.
- **⏱️ Real-Time Refresh**: Silent dashboard updates every 15 seconds.
- **📬 Inquiry System**: Dedicated portal to manage consumer inquiries.
- **⚠️ Smart Escalation**: Automated detection for stale complaints.

### 👤 Consumer Experience
- **📝 Outage Reporting**: Streamlined filing with auto Tracking ID.
- **📧 Automated Notifications**: Instant email delivery of status updates.
- **🔒 Secure Access**: JWT-based authentication.
- **🔑 Password Recovery**: OTP-based reset flow.

---

## 🛠️ Tech Stack
- **Frontend**: HTML5, CSS3, JavaScript (ES6+).
- **Backend**: Node.js, Express.js.
- **Database**: MongoDB (Mongoose).
- **Hosting**: [Vercel](https://power-pulse-pdpkp23wq-kundusayanti16s-projects.vercel.app) (Frontend), [Railway](https://power-pulse-backend-production.up.railway.app/) (Backend).

---

## 📧 Contact Support
**Technical Lead**: Sayanti and Pragathi
**Email**: projec262@gmail.com  
**Office**: Girls Hostel, LPU, Punjab

