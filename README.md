# 🌿 AQI Predictor & Environmental Analysis

A full-stack Air Quality Index (AQI) monitoring and prediction platform. Combines live environmental data with a Machine Learning model to calculate, categorize, and visualize air quality and pollutant impact.

---

## ✨ Features

- **Live Air Quality Tracking**: Real-time pollutant metrics powered by the Open-Meteo API.
- **ML AQI Prediction**: Instant AQI calculation using Random Forest & Indian CPCB sub-index standards based on **PM2.5**, **PM10**, **CO**, and **NO**.
- **Interactive Visualizations**: Dynamic gauges, pollutant breakdown cards, and feature importance charts via Chart.js.
- **Auto-Launch Local Server**: Running the app directly serves the frontend and opens the browser.
- **Deploy Anywhere**: Pre-configured for serverless deployment on **Vercel** and container deployment via **Docker**.

---

## 📁 Project Structure

```text
├── app.py                     # Flask application & static server
├── aqi_model_4features.rds    # Trained R Random Forest model file
├── backend/
│   └── predict.R              # R prediction script
├── frontend/
│   ├── index.html             # Single-page dashboard UI
│   ├── css/                   # Stylesheets
│   └── js/                    # Client logic & API integrations
├── requirements.txt           # Python dependencies
├── vercel.json                # Vercel deployment configuration
└── Dockerfile                 # Docker container setup
```

---

## 🚀 Quick Start (Local)

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run the App
```bash
python app.py
```
*The app will start at `http://127.0.0.1:5000` and automatically open your default browser.*

---

## ☁️ Deployment

### Vercel
1. Push your repository to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Leave root directory as `.` and deploy. `vercel.json` handles all routing automatically.

### Docker
```bash
docker build -t aqi-predictor .
docker run -p 5000:5000 aqi-predictor
```

---

## 🛠️ Tech Stack

- **Backend**: Python 3.10+, Flask, Flask-CORS, R (Random Forest)
- **Frontend**: HTML5, Tailwind CSS, Vanilla JavaScript, Chart.js
- **APIs**: Open-Meteo Air Quality & Geocoding API
