const ui = {
    // DOM Elements
    els: {
        loadingOverlay: document.getElementById('loading-overlay'),
        errorOverlay: document.getElementById('error-overlay'),
        errorMessage: document.getElementById('error-message'),
        dashboardContent: document.getElementById('dashboard-content'),
        
        locName: document.getElementById('loc-name'),
        locLat: document.getElementById('loc-lat'),
        locLon: document.getElementById('loc-lon'),
        locTime: document.getElementById('loc-time'),
        
        aqiValue: document.getElementById('aqi-value'),
        aqiCategory: document.getElementById('aqi-category'),
        aqiPredVal: document.getElementById('aqi-pred-val'),
        aqiRefVal: document.getElementById('aqi-ref-val'),
        
        pm25Val: document.getElementById('pm25-val'),
        pm25Bar: document.getElementById('pm25-bar'),
        pm25Status: document.getElementById('pm25-status'),
        
        pm10Val: document.getElementById('pm10-val'),
        pm10Bar: document.getElementById('pm10-bar'),
        pm10Status: document.getElementById('pm10-status'),
        
        coVal: document.getElementById('co-val'),
        coBar: document.getElementById('co-bar'),
        coStatus: document.getElementById('co-status'),
        
        noVal: document.getElementById('no-val'),
        noBar: document.getElementById('no-bar'),
        noStatus: document.getElementById('no-status'),
        
        analysisCondition: document.getElementById('analysis-condition'),
        analysisDominant: document.getElementById('analysis-dominant'),
        analysisTrend: document.getElementById('analysis-trend'),
        analysisOverview: document.getElementById('analysis-overview'),
        
        dataTableBody: document.getElementById('dataTableBody')
    },
    
    // Status thresholds (approximate for UI visualization)
    thresholds: {
        pm25: { max: 250 },
        pm10: { max: 430 },
        co: { max: 34 },
        no: { max: 200 } // Approx max NO scale
    },

    showLoading() {
        this.els.loadingOverlay.classList.remove('hidden');
        this.els.errorOverlay.classList.add('hidden');
        this.els.dashboardContent.classList.add('opacity-50');
    },
    
    hideLoading() {
        this.els.loadingOverlay.classList.add('hidden');
        this.els.dashboardContent.classList.remove('opacity-50');
    },
    
    showError(message) {
        this.hideLoading();
        this.els.errorOverlay.classList.remove('hidden');
        this.els.errorMessage.textContent = message;
    },
    
    updateLocationInfo(lat, lon, locName = "Default Location (Berlin)", timestamp = null) {
        this.els.locLat.textContent = lat.toFixed(2);
        this.els.locLon.textContent = lon.toFixed(2);
        this.els.locName.textContent = locName;
        
        if (timestamp) {
            const date = new Date(timestamp);
            this.els.locTime.textContent = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        } else {
            this.els.locTime.textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }
    },
    
    renderPollutantCards(values) {
        // PM2.5
        this.animateValue(this.els.pm25Val, values.pm25, 1);
        const pm25Pct = Math.min((values.pm25 / this.thresholds.pm25.max) * 100, 100);
        this.els.pm25Bar.style.width = `${pm25Pct}%`;
        this.els.pm25Status.textContent = this.getPollutantStatusText(pm25Pct);
        this.els.pm25Status.className = this.getPollutantStatusColor(pm25Pct);
        
        // PM10
        this.animateValue(this.els.pm10Val, values.pm10, 1);
        const pm10Pct = Math.min((values.pm10 / this.thresholds.pm10.max) * 100, 100);
        this.els.pm10Bar.style.width = `${pm10Pct}%`;
        this.els.pm10Status.textContent = this.getPollutantStatusText(pm10Pct);
        this.els.pm10Status.className = this.getPollutantStatusColor(pm10Pct);
        
        // CO
        this.animateValue(this.els.coVal, values.co, 3);
        const coPct = Math.min((values.co / this.thresholds.co.max) * 100, 100);
        this.els.coBar.style.width = `${coPct}%`;
        this.els.coStatus.textContent = this.getPollutantStatusText(coPct);
        this.els.coStatus.className = this.getPollutantStatusColor(coPct);
        
        // NO
        this.animateValue(this.els.noVal, values.no, 1);
        const noPct = Math.min((values.no / this.thresholds.no.max) * 100, 100);
        this.els.noBar.style.width = `${noPct}%`;
        this.els.noStatus.textContent = this.getPollutantStatusText(noPct);
        this.els.noStatus.className = this.getPollutantStatusColor(noPct);
    },
    
    getPollutantStatusText(percent) {
        if (percent < 20) return "Good";
        if (percent < 40) return "Moderate";
        if (percent < 60) return "High";
        return "Severe";
    },
    
    getPollutantStatusColor(percent) {
        if (percent < 20) return "text-green-400";
        if (percent < 40) return "text-yellow-400";
        if (percent < 60) return "text-orange-400";
        return "text-red-400";
    },
    
    renderAQICard(predAqi, category, refAqi) {
        this.animateValue(this.els.aqiValue, predAqi, 0);
        this.els.aqiCategory.textContent = category;
        this.els.aqiPredVal.textContent = Math.round(predAqi);
        this.els.aqiRefVal.textContent = refAqi ? Math.round(refAqi) : "N/A";
        
        // Apply color based on category
        const colors = {
            "Good": { bg: 'bg-green-900', text: 'text-green-300', border: 'border-green-700' },
            "Satisfactory": { bg: 'bg-yellow-900', text: 'text-yellow-300', border: 'border-yellow-700' },
            "Moderate": { bg: 'bg-orange-900', text: 'text-orange-300', border: 'border-orange-700' },
            "Poor": { bg: 'bg-red-900', text: 'text-red-300', border: 'border-red-700' },
            "Very Poor": { bg: 'bg-purple-900', text: 'text-purple-300', border: 'border-purple-700' },
            "Severe": { bg: 'bg-rose-950', text: 'text-rose-300', border: 'border-rose-800' }
        };
        
        const catColor = colors[category] || { bg: 'bg-gray-800', text: 'text-gray-400', border: 'border-gray-700' };
        
        this.els.aqiCategory.className = `px-6 py-2 rounded-full font-bold text-lg tracking-wide border ${catColor.bg} ${catColor.text} ${catColor.border}`;
    },
    
    renderAnalysisSummary(values, aqi, category, featureImportance) {
        this.els.analysisCondition.textContent = category;
        
        // Determine dominant pollutant based on feature importance
        if (featureImportance) {
            let maxImp = -1;
            let dominant = "";
            for (const [key, val] of Object.entries(featureImportance)) {
                if (val > maxImp) {
                    maxImp = val;
                    dominant = key;
                }
            }
            this.els.analysisDominant.textContent = dominant;
            this.els.analysisOverview.textContent = `${dominant} is currently the most influential pollutant according to the trained Random Forest model's feature importance (score: ${maxImp.toFixed(1)}). The overall air quality is classified as ${category} with a predicted AQI of ${Math.round(aqi)}.`;
        } else {
            this.els.analysisDominant.textContent = "Unknown";
            this.els.analysisOverview.textContent = `The overall air quality is classified as ${category}.`;
        }
        
        // Determine simple trend by comparing last few hours if possible, otherwise placeholder
        this.els.analysisTrend.textContent = "Stable";
    },
    
    renderDataTable(values) {
        const tbody = document.getElementById('data-table-body');
        if (!tbody) return;
        
        const data = [
            { name: "PM2.5", val: values.pm25, unit: "µg/m³", status: this.getPollutantStatusText(Math.min((values.pm25 / this.thresholds.pm25.max) * 100, 100)) },
            { name: "PM10", val: values.pm10, unit: "µg/m³", status: this.getPollutantStatusText(Math.min((values.pm10 / this.thresholds.pm10.max) * 100, 100)) },
            { name: "CO", val: values.co, unit: "mg/m³", status: this.getPollutantStatusText(Math.min((values.co / this.thresholds.co.max) * 100, 100)) },
            { name: "NO", val: values.no, unit: "µg/m³", status: this.getPollutantStatusText(Math.min((values.no / this.thresholds.no.max) * 100, 100)) }
        ];
        
        tbody.innerHTML = '';
        data.forEach(item => {
            const tr = document.createElement('tr');
            tr.className = "bg-gray-800 border-b border-gray-700 hover:bg-gray-700 transition-colors";
            tr.innerHTML = `
                <td class="px-4 py-3 font-medium text-white">${item.name}</td>
                <td class="px-4 py-3">${item.val.toFixed(item.name === 'CO' ? 3 : 1)}</td>
                <td class="px-4 py-3">${item.unit}</td>
                <td class="px-4 py-3"><span class="px-2 py-1 bg-gray-900 rounded text-xs">${item.status}</span></td>
            `;
            tbody.appendChild(tr);
        });
    },

    animateValue(obj, end, decimals) {
        if (!obj) return;
        let startTimestamp = null;
        const duration = 1000;
        const start = 0; // Or parse current value if we want to go from current to new
        
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            // ease out cubic
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const current = start + easeProgress * (end - start);
            
            obj.innerHTML = current.toFixed(decimals);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                obj.innerHTML = end.toFixed(decimals);
            }
        };
        window.requestAnimationFrame(step);
    }
};
