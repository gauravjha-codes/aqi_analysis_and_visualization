const app = {
    state: {
        lat: 52.52,
        lon: 13.41,
        locName: "Berlin",
        isGeolocation: false,
        trendDays: 1,
        hourlyRawData: null
    },
    
    async init() {
        console.log("Initializing AQI Dashboard...");
        
        // Initialize charts
        chartManager.initAQIGauge();
        chartManager.initFeatureImportance();
        chartManager.initTrendCharts();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initial data fetch
        await this.refreshData();
    },
    
    setupEventListeners() {
        document.getElementById('btn-refresh').addEventListener('click', () => this.refreshData());
        
        document.getElementById('btn-use-location').addEventListener('click', () => {
            if (navigator.geolocation) {
                ui.showLoading();
                navigator.geolocation.getCurrentPosition(
                    position => {
                        this.state.lat = position.coords.latitude;
                        this.state.lon = position.coords.longitude;
                        this.state.locName = "Your Location";
                        this.state.isGeolocation = true;
                        this.refreshData();
                    },
                    error => {
                        console.error("Geolocation error:", error);
                        ui.showError("Location access denied or unavailable. Using default location.");
                        setTimeout(() => this.refreshData(), 3000); // Retry with defaults after showing error
                    },
                    { timeout: 10000 }
                );
            } else {
                alert("Geolocation is not supported by your browser.");
            }
        });

        const handleSearch = async () => {
            const input = document.getElementById('loc-search-input').value.trim();
            if (!input) return;
            
            ui.showLoading();
            try {
                const result = await api.geocode(input);
                this.state.lat = result.lat;
                this.state.lon = result.lon;
                this.state.locName = `${result.name}, ${result.country}`;
                this.state.isGeolocation = false;
                await this.refreshData();
            } catch (error) {
                ui.showError(error.message === "City not found" ? "City not found. Please try another." : "Error searching location.");
                setTimeout(() => ui.hideLoading(), 2000);
            }
        };

        document.getElementById('btn-search-loc').addEventListener('click', handleSearch);
        document.getElementById('loc-search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearch();
        });

        // Manual Entry Logic
        const manualModal = document.getElementById('manual-modal');
        document.getElementById('btn-manual-entry').addEventListener('click', () => {
            manualModal.classList.remove('hidden');
        });
        
        const closeModal = () => manualModal.classList.add('hidden');
        document.getElementById('btn-close-modal').addEventListener('click', closeModal);
        document.getElementById('btn-cancel-modal').addEventListener('click', closeModal);
        
        document.getElementById('btn-submit-manual').addEventListener('click', async () => {
            const pm25 = parseFloat(document.getElementById('manual-pm25').value);
            const pm10 = parseFloat(document.getElementById('manual-pm10').value);
            const co = parseFloat(document.getElementById('manual-co').value);
            const no = parseFloat(document.getElementById('manual-no').value);
            
            if (isNaN(pm25) || isNaN(pm10) || isNaN(co) || isNaN(no)) {
                alert("Please enter valid numbers for all pollutants.");
                return;
            }
            
            closeModal();
            await this.handleManualPrediction(pm25, pm10, co, no);
        });

        // Trend period buttons
        const trendBtns = document.querySelectorAll('.trend-btn');
        trendBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Update active styles
                trendBtns.forEach(b => {
                    b.classList.remove('active', 'text-white', 'bg-gray-600');
                    b.classList.add('text-gray-400', 'hover:text-white', 'hover:bg-gray-700');
                });
                
                const target = e.currentTarget;
                target.classList.remove('text-gray-400', 'hover:text-white', 'hover:bg-gray-700');
                target.classList.add('active', 'text-white', 'bg-gray-600');
                
                this.state.trendDays = parseInt(target.dataset.days);
                
                // Update charts if data exists
                if (this.state.hourlyRawData) {
                    chartManager.updateTrendCharts(this.state.hourlyRawData, this.state.trendDays);
                }
            });
        });
        
        // Mobile menu toggle
        document.getElementById('btn-mobile-menu').addEventListener('click', () => {
            // simple toggle logic if needed, but flex wrap in main nav usually suffices for basic layout
            const navLinks = document.querySelector('.hidden.md\\:block');
            if(navLinks) {
                navLinks.classList.toggle('hidden');
            }
        });
    },
    
    async refreshData() {
        ui.showLoading();
        
        try {
            // 1. Fetch raw data from Open-Meteo
            // Fetching past 7 days to support the 7-day trend view
            const rawData = await api.fetchAirQuality(this.state.lat, this.state.lon, 7);
            
            // 2. Extract current values
            const currentVals = api.getCurrentValues(rawData.hourly);
            this.state.hourlyRawData = rawData.hourly;
            
            // 3. Update Location UI
            ui.updateLocationInfo(this.state.lat, this.state.lon, this.state.locName, currentVals.timestamp);
            
            // 4. Update Pollutant Cards
            ui.renderPollutantCards(currentVals);
            ui.renderDataTable(currentVals);
            
            // 5. Fetch Prediction from ML Model
            const predResult = await api.predictAQI(
                currentVals.pm25, 
                currentVals.pm10, 
                currentVals.co, 
                currentVals.no
            );
            
            // 6. Update AQI UI
            if (predResult.success) {
                ui.renderAQICard(predResult.predicted_aqi, predResult.aqi_category, currentVals.reference_aqi);
                chartManager.updateAQIGauge(predResult.predicted_aqi, predResult.aqi_category);
                
                // 7. Update Analysis & Feature Importance
                ui.renderAnalysisSummary(currentVals, predResult.predicted_aqi, predResult.aqi_category, predResult.feature_importance);
                chartManager.updateFeatureImportance(predResult.feature_importance);
            } else {
                throw new Error("Prediction failed.");
            }
            
            // 8. Update Trend Charts
            chartManager.updateTrendCharts(this.state.hourlyRawData, this.state.trendDays);
            
            ui.hideLoading();
            
        } catch (error) {
            console.error("Dashboard refresh error:", error);
            ui.showError(error.message || "Failed to load dashboard data.");
        }
    },
    
    async handleManualPrediction(pm25, pm10, co, no) {
        ui.showLoading();
        try {
            const currentVals = {
                timestamp: new Date().toISOString(),
                pm25: pm25,
                pm10: pm10,
                co: co,
                no: no,
                reference_aqi: null // No reference AQI for manual entry
            };
            
            // Update Location UI
            this.state.locName = "Manual Entry";
            ui.updateLocationInfo(this.state.lat, this.state.lon, this.state.locName, currentVals.timestamp);
            
            // Update Pollutant Cards
            ui.renderPollutantCards(currentVals);
            ui.renderDataTable(currentVals);
            
            // Fetch Prediction from ML Model
            const predResult = await api.predictAQI(pm25, pm10, co, no);
            
            if (predResult.success) {
                ui.renderAQICard(predResult.predicted_aqi, predResult.aqi_category, currentVals.reference_aqi);
                chartManager.updateAQIGauge(predResult.predicted_aqi, predResult.aqi_category);
                
                ui.renderAnalysisSummary(currentVals, predResult.predicted_aqi, predResult.aqi_category, predResult.feature_importance);
                chartManager.updateFeatureImportance(predResult.feature_importance);
            } else {
                throw new Error("Prediction failed.");
            }
            
            // Note: Trend charts retain previous data but that's acceptable for manual entry overriding current view
            
            ui.hideLoading();
        } catch (error) {
            console.error("Manual prediction error:", error);
            ui.showError(error.message || "Failed to predict AQI manually.");
        }
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
