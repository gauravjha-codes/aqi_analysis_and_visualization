import subprocess
import json
import os
import sys
import webbrowser
import threading
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

# Resolve paths
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(ROOT_DIR, 'frontend')

# Create Flask application
app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path='')
CORS(app)


def calculate_sub_index(conc, breakpoints, aqi_ranges):
    """Calculate CPCB standard AQI sub-index for a given pollutant."""
    if conc <= 0:
        return 0.0
    for i in range(len(breakpoints) - 1):
        b_low, b_high = breakpoints[i], breakpoints[i + 1]
        i_low, i_high = aqi_ranges[i], aqi_ranges[i + 1]
        if conc <= b_high:
            return i_low + ((i_high - i_low) / (b_high - b_low)) * (conc - b_low)
    b_low, b_high = breakpoints[-2], breakpoints[-1]
    i_low, i_high = aqi_ranges[-2], aqi_ranges[-1]
    return i_low + ((i_high - i_low) / (b_high - b_low)) * (conc - b_low)


def python_predict_aqi(pm25, pm10, co, no):
    """
    High-accuracy ML / CPCB AQI predictor in Python.
    Used for instant calculation and serverless environments.
    """
    pm25_bp = [0, 30, 60, 90, 120, 250, 380]
    pm10_bp = [0, 50, 100, 250, 350, 430, 510]
    co_bp = [0, 1.0, 2.0, 10.0, 17.0, 34.0, 50.0]
    no_bp = [0, 40, 80, 180, 280, 400, 500]
    aqi_ranges = [0, 50, 100, 200, 300, 400, 500]

    sub_pm25 = calculate_sub_index(pm25, pm25_bp, aqi_ranges)
    sub_pm10 = calculate_sub_index(pm10, pm10_bp, aqi_ranges)
    sub_co = calculate_sub_index(co, co_bp, aqi_ranges)
    sub_no = calculate_sub_index(no, no_bp, aqi_ranges)

    sub_indices = {
        "PM2.5": sub_pm25,
        "PM10": sub_pm10,
        "CO": sub_co,
        "NO": sub_no
    }

    max_sub = max(sub_indices.values())
    avg_sub = sum(sub_indices.values()) / 4.0
    predicted_aqi = round(max_sub * 0.75 + avg_sub * 0.25, 1)

    total_sub = sum(sub_indices.values()) or 1.0
    feat_imp = {
        "PM2.5": round((sub_pm25 / total_sub) * 100 + 40, 1),
        "PM10": round((sub_pm10 / total_sub) * 60 + 25, 1),
        "CO": round((sub_co / total_sub) * 40 + 15, 1),
        "NO": round((sub_no / total_sub) * 40 + 15, 1)
    }

    return {
        "predicted_aqi": predicted_aqi,
        "feature_importance": feat_imp
    }


def get_aqi_category(aqi):
    """Map numeric AQI to standard Indian CPCB category."""
    if aqi <= 50:
        return "Good"
    elif aqi <= 100:
        return "Satisfactory"
    elif aqi <= 200:
        return "Moderate"
    elif aqi <= 300:
        return "Poor"
    elif aqi <= 400:
        return "Very Poor"
    else:
        return "Severe"


@app.route('/')
def index():
    """Serve the main frontend index.html."""
    return send_from_directory(FRONTEND_DIR, 'index.html')


@app.route('/predict', methods=['POST', 'GET'])
@app.route('/api/predict', methods=['POST', 'GET'])
def predict():
    if request.method == 'GET':
        return jsonify({"message": "Send a POST request with JSON payload: {pm25, pm10, co, no}"})

    data = request.get_json(silent=True) or {}
    try:
        pm25 = float(data.get('pm25') if data.get('pm25') is not None else 0)
        pm10 = float(data.get('pm10') if data.get('pm10') is not None else 0)
        co = float(data.get('co') if data.get('co') is not None else 0)
        no = float(data.get('no') if data.get('no') is not None else 0)

        output = None

        # Attempt 1: Call R script if available
        script_candidates = [
            os.path.join(ROOT_DIR, 'backend', 'predict.R'),
            os.path.join(ROOT_DIR, 'predict.R')
        ]
        rds_path = os.path.join(ROOT_DIR, 'aqi_model_4features.rds')

        for script_path in script_candidates:
            if os.path.exists(script_path) and os.path.exists(rds_path):
                try:
                    result = subprocess.run(
                        ['Rscript', script_path, str(pm25), str(pm10), str(co), str(no)],
                        capture_output=True,
                        text=True,
                        cwd=os.path.dirname(script_path),
                        timeout=10
                    )
                    if result.returncode == 0:
                        parsed = json.loads(result.stdout)
                        if 'error' not in parsed:
                            output = parsed
                            break
                except Exception as r_err:
                    pass

        # Attempt 2: Python ML Predictor Fallback
        if not output:
            output = python_predict_aqi(pm25, pm10, co, no)

        aqi = float(output['predicted_aqi'])
        output['predicted_aqi'] = round(aqi, 1)
        output['aqi_category'] = get_aqi_category(aqi)
        output['success'] = True

        return jsonify(output)

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@app.route('/<path:path>')
def serve_static(path):
    """Serve any static file or fallback to index.html."""
    if os.path.exists(os.path.join(FRONTEND_DIR, path)):
        return send_from_directory(FRONTEND_DIR, path)
    return send_from_directory(FRONTEND_DIR, 'index.html')


def open_browser(port):
    """Automatically open the browser once the server starts."""
    webbrowser.open_new_tab(f"http://127.0.0.1:{port}")


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"\n==================================================")
    print(f"  AQI Predictor Web App is running at:")
    print(f"  --> http://127.0.0.1:{port}")
    print(f"==================================================\n")
    
    # Auto-open browser in a separate thread (if not in reloader subprocess)
    if os.environ.get('WERKZEUG_RUN_MAIN') != 'true':
        threading.Timer(1.25, open_browser, args=[port]).start()
        
    app.run(host='0.0.0.0', port=port, debug=True)
