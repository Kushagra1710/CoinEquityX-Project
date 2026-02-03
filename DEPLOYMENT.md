# Deployment Guide

This project is configured for a **Frontend (Vercel)** + **Backend (Render)** deployment architecture. It uses **Supabase** and **Firebase** for various services. Follow these steps to deploy your application.

## 1. Backend Deployment (Render)

First, we need to deploy the backend so we can get its URL for the frontend configuration.

1.  **Log in to [Render](https://dashboard.render.com/)**.
2.  Click **New +** -> **Web Service**.
3.  Connect your GitHub repository: `Kushagra1710/CoinEquityX-Project`.
4.  Configure the service with these settings:
    *   **Name**: `coinequityx-backend` (or similar)
    *   **Root Directory**: `.` (leave empty or enter `.`)
    *   **Runtime**: `Node`
    *   **Build Command**: `npm install`
    *   **Start Command**: `npm start`
    *   **Instance Type**: Free (or as needed)
5.  **Environment Variables**:
    *   Scroll down to "Environment Variables" and add these keys (values should match your local `.env` or be new production keys):
        *   `MONGODB_URI`: Connection string for your production MongoDB.
        *   `CMC_API_KEY`: CoinMarketCap API Key.
        *   `FREE_CURRENCY_API_KEY`: Free Currency API Key.
        *   `MARKETAUX_API_KEY`: MarketAux API Key.
        *   `FINNHUB_API_KEY`: Finnhub API Key (Required for Stocks).
        *   `GEMINI_API_KEY`: Google Gemini API Key.
        *   `PORT`: `3000` (Render creates this automatically, but good to double check it listens on `process.env.PORT`).
6.  Click **Create Web Service**.
7.  **Copy the Backend URL**: Once deployed, copy the URL (e.g., `https://coinequityx-backend.onrender.com`).

## 2. Frontend Deployment (Vercel)

Now deploy the frontend and connect it to the backend and external services.

1.  **Log in to [Vercel](https://vercel.com/)**.
2.  Click **Add New...** -> **Project**.
3.  Import `Kushagra1710/CoinEquityX-Project`.
4.  Configure the project:
    *   **Framework Preset**: `Vite`
    *   **Root Directory**: Click "Edit" and select `frontend-react`.
    *   **Build Command**: `vite build` (default).
    *   **Output Directory**: `dist` (default).
5.  **Environment Variables**:
    *   Expand "Environment Variables". You must add **ALL** of the following:

    **General:**
    *   `VITE_API_BASE_URL`: **Your Render Backend URL** (e.g., `https://coinequityx-backend.onrender.com`). *Note: Do not add a trailing slash.*

    **Supabase:**
    *   `VITE_SUPABASE_URL`: Your Supabase Project URL.
    *   `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key.

    **Firebase:**
    *   `VITE_FIREBASE_API_KEY`
    *   `VITE_FIREBASE_AUTH_DOMAIN`
    *   `VITE_FIREBASE_PROJECT_ID`
    *   `VITE_FIREBASE_STORAGE_BUCKET`
    *   `VITE_FIREBASE_MESSAGING_SENDER_ID`
    *   `VITE_FIREBASE_APP_ID`
    *   `VITE_FIREBASE_MEASUREMENT_ID`

6.  Click **Deploy**.

## 3. Configure CI/CD (Optional)

Your project includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that can automatically deploy to Vercel and trigger Render updates.

### To enable automated backend deploys:
1.  In Render, go to **Settings** -> **Deploy Hook**.
2.  Copy the Deploy Hook URL.
3.  In GitHub Repo -> **Settings** -> **Secrets and variables** -> **Actions**, add:
    *   `RENDER_DEPLOY_HOOK`: Paste the URL.

### To enable automated frontend deploys:
You likely don't need to do anything extra if you connected Vercel to GitHub, as Vercel handles this automatically. If you want the GitHub Action to drive it specially:
1.  Get your Vercel Token from Account Settings.
2.  Get `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` (can be found in `.vercel/project.json` if you link locally, or in Vercel project settings).
3.  Add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` to GitHub Secrets.
