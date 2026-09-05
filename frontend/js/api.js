const api = {
    // Open-Meteo API config
    omBaseUrl: 'https://air-quality-api.open-meteo.com/v1/air-quality',
    
    // Backend API config (dynamic for local and Vercel deployment)
    backendUrl: (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '5000' && window.location.port !== '')
        ? 'http://localhost:5000/predict'
        : '/predict',
    
    /**
     * Fetch hourly air quality data from Open-Meteo for a given location.
     */
    async fetchAirQuality(lat, lon, pastDays = 7) {
        try {
            const url = `${this.omBaseUrl}?latitude=${lat}&longitude=${lon}&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,european_aqi&past_days=${pastDays}`;
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching air quality data:', error);
            throw error;
        }
    },
    
    /**
     * Geocode a city name to coordinates.
     */
    async geocode(city) {
        try {
            const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&format=json`;
            const response = await fetch(url);
            if (!response.ok) throw new Error("Geocoding failed");
            const data = await response.json();
            if (!data.results || data.results.length === 0) {
                throw new Error("City not found");
            }
            return {
                lat: data.results[0].latitude,
                lon: data.results[0].longitude,
                name: data.results[0].name,
                country: data.results[0].country
            };
        } catch (error) {
            console.error('Geocoding error:', error);
            throw error;
        }
    },
    
    /**
     * Get the latest/current available hourly values from the Open-Meteo data.
     */
    getCurrentValues(hourlyData) {
        // Open-Meteo provides an array of hours. 
        // We find the current hour index based on current time or just take the last valid entry up to current time.
        
        const times = hourlyData.time;
        const now = new Date();
        now.setMinutes(0, 0, 0); // round to current hour
        
        // Find index closest to now, or just the last index that isn't null
        let currentIndex = -1;
        const nowISO = now.toISOString().substring(0, 14) + "00"; // e.g. "2023-10-25T14:00"
        
        for (let i = times.length - 1; i >= 0; i--) {
            // we look for the latest hour that has a pm2_5 value to ensure data is present
            if (hourlyData.pm2_5[i] !== null) {
                currentIndex = i;
                // If it matches exactly current hour, break. Otherwise just take latest available.
                if (times[i] <= nowISO) {
                   break;
                }
            }
        }
        
        if (currentIndex === -1) {
            throw new Error("No valid recent air quality data found in API response.");
        }
        
        const pm25 = hourlyData.pm2_5[currentIndex];
        const pm10 = hourlyData.pm10[currentIndex];
        const co_ug = hourlyData.carbon_monoxide[currentIndex]; // in ug/m3
        const no = hourlyData.nitrogen_dioxide[currentIndex]; // frontend display as NO
        const aqi = hourlyData.european_aqi ? hourlyData.european_aqi[currentIndex] : null;
        
        // CONVERT CO from ug/m3 to mg/m3
        const co_mg = this.convertCO(co_ug);
        
        return {
            timestamp: times[currentIndex],
            pm25: pm25,
            pm10: pm10,
            co: co_mg, 
            no: no,
            reference_aqi: aqi
        };
    },
    
    /**
     * Convert CO from ug/m3 to mg/m3.
     */
    convertCO(co_ug) {
        if (co_ug === null || co_ug === undefined) return 0;
        return co_ug / 1000.0;
    },
    
    /**
     * Fetch predicted AQI and feature importance from backend model.
     */
    async predictAQI(pm25, pm10, co, no) {
        try {
            const payload = {
                pm25: pm25,
                pm10: pm10,
                co: co,
                no: no
            };
            
            const response = await fetch(this.backendUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                // If backend is down, we can return a mock or throw
                console.warn(`Backend prediction failed: ${response.status}. Make sure the Flask server is running.`);
                throw new Error("Backend server error");
            }
            
            const data = await response.json();
            return data;
            
        } catch (error) {
            console.error('Error predicting AQI:', error);
            
            // For UI demonstration purposes if backend isn't started yet:
            console.log("Using fallback mock prediction.");
            // Mock formula (not real RF) just so UI doesn't completely break
            const mockAqi = Math.round((pm25 * 1.5) + (pm10 * 0.8) + (co * 20) + (no * 1.2));
            return {
                success: true,
                predicted_aqi: mockAqi,
                aqi_category: this.getMockAQICategory(mockAqi),
                feature_importance: {
                    "PM2.5": 150,
                    "PM10": 80,
                    "CO": 45,
                    "NO": 100
                },
                is_mock: true
            };
        }
    },
    
    getMockAQICategory(aqi) {
        if (aqi <= 50) return "Good";
        if (aqi <= 100) return "Satisfactory";
        if (aqi <= 200) return "Moderate";
        if (aqi <= 300) return "Poor";
        if (aqi <= 400) return "Very Poor";
        return "Severe";
    }
};
