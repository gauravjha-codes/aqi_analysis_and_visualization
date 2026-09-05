// Global Chart Defaults
Chart.defaults.color = '#9ca3af';
Chart.defaults.font.family = 'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif';

const chartManager = {
    instances: {},

    initAQIGauge() {
        const ctx = document.getElementById('aqi-gauge').getContext('2d');
        
        this.instances.aqiGauge = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['AQI', 'Remaining'],
                datasets: [{
                    data: [0, 500],
                    backgroundColor: [
                        '#3b82f6', // placeholder color
                        '#1f2937'
                    ],
                    borderWidth: 0,
                    circumference: 270,
                    rotation: 225,
                    cutout: '85%',
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                animation: {
                    animateScale: true,
                    animateRotate: true,
                    duration: 1500,
                    easing: 'easeOutCubic'
                }
            }
        });
    },

    updateAQIGauge(aqi, category) {
        if (!this.instances.aqiGauge) return;
        
        let color = '#3b82f6';
        if (category === 'Good') color = '#22c55e';
        else if (category === 'Satisfactory') color = '#eab308';
        else if (category === 'Moderate') color = '#f97316';
        else if (category === 'Poor') color = '#ef4444';
        else if (category === 'Very Poor') color = '#a855f7';
        else if (category === 'Severe') color = '#9f1239';

        const maxScale = 500;
        const boundedAqi = Math.min(Math.max(aqi, 0), maxScale);
        
        this.instances.aqiGauge.data.datasets[0].data = [boundedAqi, maxScale - boundedAqi];
        this.instances.aqiGauge.data.datasets[0].backgroundColor[0] = color;
        this.instances.aqiGauge.update();
    },

    initFeatureImportance() {
        const ctx = document.getElementById('feature-importance-chart').getContext('2d');
        
        this.instances.featImp = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Importance',
                    data: [],
                    backgroundColor: [
                        'rgba(59, 130, 246, 0.7)',
                        'rgba(16, 185, 129, 0.7)',
                        'rgba(245, 158, 11, 0.7)',
                        'rgba(239, 68, 68, 0.7)'
                    ],
                    borderColor: [
                        'rgb(59, 130, 246)',
                        'rgb(16, 185, 129)',
                        'rgb(245, 158, 11)',
                        'rgb(239, 68, 68)'
                    ],
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { color: '#374151', drawBorder: false }
                    },
                    y: {
                        grid: { display: false }
                    }
                }
            }
        });
    },

    updateFeatureImportance(importanceObj) {
        if (!this.instances.featImp || !importanceObj) return;
        
        // Sort by value descending
        const sorted = Object.entries(importanceObj).sort((a, b) => b[1] - a[1]);
        
        this.instances.featImp.data.labels = sorted.map(item => item[0]);
        this.instances.featImp.data.datasets[0].data = sorted.map(item => item[1]);
        this.instances.featImp.update();
    },

    initTrendCharts() {
        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(17, 24, 39, 0.9)',
                    titleColor: '#e5e7eb',
                    bodyColor: '#e5e7eb',
                    borderColor: '#374151',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: { display: false, drawBorder: false },
                    ticks: {
                        maxTicksLimit: 6,
                        maxRotation: 0,
                        autoSkip: true
                    }
                },
                y: {
                    grid: { color: 'rgba(55, 65, 81, 0.5)', drawBorder: false }
                }
            },
            elements: {
                point: { radius: 0, hitRadius: 10, hoverRadius: 4 },
                line: { tension: 0.4 } // smooth curves
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        };

        const createChart = (id, color, label) => {
            const ctx = document.getElementById(id).getContext('2d');
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, `${color}80`); // 50% opacity
            gradient.addColorStop(1, `${color}00`); // 0% opacity

            return new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: label,
                        data: [],
                        borderColor: color,
                        backgroundColor: gradient,
                        borderWidth: 2,
                        fill: true
                    }]
                },
                options: commonOptions
            });
        };

        this.instances.pm25Trend = createChart('chart-pm25', '#3b82f6', 'PM2.5');
        this.instances.pm10Trend = createChart('chart-pm10', '#10b981', 'PM10');
        this.instances.coTrend = createChart('chart-co', '#f59e0b', 'CO');
        this.instances.noTrend = createChart('chart-no', '#ef4444', 'NO');
    },

    updateTrendCharts(hourlyData, days = 1) {
        // Extract the required number of hours (24, 72, 168)
        const hoursNeeded = days * 24;
        
        // Open-Meteo gives arrays covering past days. We take the last 'hoursNeeded' valid elements
        const times = hourlyData.time;
        
        // Find current hour index
        const now = new Date();
        now.setMinutes(0, 0, 0);
        const nowISO = now.toISOString().substring(0, 14) + "00";
        
        let endIndex = times.length - 1;
        for (let i = times.length - 1; i >= 0; i--) {
            if (times[i] <= nowISO) {
                endIndex = i;
                break;
            }
        }
        
        const startIndex = Math.max(0, endIndex - hoursNeeded + 1);
        
        const formatTime = (isoStr) => {
            const date = new Date(isoStr);
            if (days === 1) return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            return date.toLocaleDateString([], {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'});
        };

        const labels = times.slice(startIndex, endIndex + 1).map(formatTime);
        
        const pm25Data = hourlyData.pm2_5.slice(startIndex, endIndex + 1);
        const pm10Data = hourlyData.pm10.slice(startIndex, endIndex + 1);
        // Map CO to mg/m3
        const coData = hourlyData.carbon_monoxide.slice(startIndex, endIndex + 1).map(api.convertCO);
        const noData = hourlyData.nitrogen_dioxide.slice(startIndex, endIndex + 1);

        this.updateSingleTrend(this.instances.pm25Trend, labels, pm25Data);
        this.updateSingleTrend(this.instances.pm10Trend, labels, pm10Data);
        this.updateSingleTrend(this.instances.coTrend, labels, coData);
        this.updateSingleTrend(this.instances.noTrend, labels, noData);
    },

    updateSingleTrend(chartInstance, labels, data) {
        if (!chartInstance) return;
        chartInstance.data.labels = labels;
        chartInstance.data.datasets[0].data = data;
        chartInstance.update();
    }
};
