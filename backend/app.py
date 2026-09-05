import subprocess
import json
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os

frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend'))

app = Flask(__name__, static_folder=frontend_dir, static_url_path='')
CORS(app)

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json(silent=True) or {}
    try:
        pm25 = float(data.get('pm25') if data.get('pm25') is not None else 0)
        pm10 = float(data.get('pm10') if data.get('pm10') is not None else 0)
        co = float(data.get('co') if data.get('co') is not None else 0)
        no = float(data.get('no') if data.get('no') is not None else 0)
        
        # Call R script
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        script_path = os.path.join(backend_dir, 'predict.R')
        result = subprocess.run(
            ['Rscript', script_path, str(pm25), str(pm10), str(co), str(no)],
            capture_output=True,
            text=True,
            cwd=backend_dir
        )
        
        if result.returncode != 0:
            print(f"R Script Error: {result.stderr}")
            # Fallback if R is not available for testing
            return jsonify({'success': False, 'error': result.stderr}), 500
            
        output = json.loads(result.stdout)
        
        if 'error' in output:
             return jsonify({'success': False, 'error': output['error']}), 500
             
        # Determine AQI category based on Indian AQI standards
        aqi = output['predicted_aqi']
        if aqi <= 50:
            category = "Good"
        elif aqi <= 100:
            category = "Satisfactory"
        elif aqi <= 200:
            category = "Moderate"
        elif aqi <= 300:
            category = "Poor"
        elif aqi <= 400:
            category = "Very Poor"
        else:
            category = "Severe"
            
        output['aqi_category'] = category
        output['success'] = True
        
        return jsonify(output)

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)

