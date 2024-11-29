// Initialize the map centered on Chennai
const map = L.map('map').setView([13.0827, 80.2707], 8);

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: ' OpenStreetMap contributors'
}).addTo(map);

// Store weather markers
let weatherMarkers = new Map();

// Monitoring points around Chennai
const monitoringPoints = [
    { lat: 13.0827, lon: 80.2707, name: "Chennai City" },
    { lat: 12.9516, lon: 80.1462, name: "Chennai Airport" },
    { lat: 13.1067, lon: 80.2917, name: "Chennai Port" },
    { lat: 12.8185, lon: 80.0341, name: "Mamallapuram" },
    { lat: 13.6288, lon: 79.4192, name: "Tirupati" },
    { lat: 11.9416, lon: 79.8083, name: "Pondicherry" }
];

// OpenWeatherMap API Key
const API_KEY = 'dc6df789b87e53e3e44d9c07388d5f57';

// Function to get wind direction
function getWindDirection(degrees) {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
}

// Function to get weather severity level
function getWeatherSeverity(data) {
    if (!data || !data.wind || !data.main) return { level: 'Unknown', color: '#808080' };
    
    const wind_speed = data.wind.speed || 0;
    const pressure = data.main.pressure || 1013;
    
    if (wind_speed > 32.7) return { level: 'Severe Cyclonic Storm', color: '#FF0000' };
    if (wind_speed > 24.5) return { level: 'Cyclonic Storm', color: '#FFA500' };
    if (wind_speed > 17.2) return { level: 'Deep Depression', color: '#FFFF00' };
    if (wind_speed > 13.9) return { level: 'Depression', color: '#00FF00' };
    if (pressure < 985) return { level: 'Low Pressure System', color: '#0000FF' };
    return { level: 'Normal', color: '#808080' };
}

// Function to convert visibility from meters to kilometers
function convertVisibility(meters) {
    return ((meters || 0) / 1000).toFixed(1);
}

// Function to safely get weather data
function safeGetWeatherData(data) {
    if (!data) return null;
    
    return {
        coord: { lat: data.coord?.lat || 0, lon: data.coord?.lon || 0 },
        wind: { 
            speed: data.wind?.speed || 0, 
            deg: data.wind?.deg || 0 
        },
        main: {
            pressure: data.main?.pressure || 1013,
            temp: data.main?.temp || 0,
            feels_like: data.main?.feels_like || 0,
            humidity: data.main?.humidity || 0
        },
        weather: [{
            main: data.weather?.[0]?.main || 'Unknown',
            description: data.weather?.[0]?.description || 'No description available'
        }],
        visibility: data.visibility || 0,
        clouds: { all: data.clouds?.all || 0 },
        dt: data.dt || Date.now() / 1000
    };
}

// Function to update last update time
function updateLastUpdateTime() {
    const lastUpdateElement = document.getElementById('last-update');
    if (lastUpdateElement) {
        lastUpdateElement.textContent = new Date().toLocaleTimeString();
    }
}

// Function to fetch weather data
async function fetchWeatherData() {
    const weatherList = document.getElementById('cyclone-list');
    weatherList.innerHTML = '<div class="cyclone-card"><p>Fetching latest weather data for Chennai region...</p></div>';

    try {
        // Fetch weather data for all monitoring points
        const promises = monitoringPoints.map(point => 
            fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${point.lat}&lon=${point.lon}&units=metric&appid=${API_KEY}`)
                .then(response => {
                    if (!response.ok) {
                        if (response.status === 401) {
                            throw new Error('Invalid API key. Please check your OpenWeatherMap API key.');
                        }
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .catch(error => {
                    console.error(`Error fetching data for ${point.name}:`, error);
                    return null;
                })
        );

        const results = await Promise.all(promises);
        const validResults = results.map(safeGetWeatherData).filter(Boolean);
        
        if (validResults.length === 0) {
            throw new Error('No valid weather data received. Please check your API key and internet connection.');
        }
        
        updateWeatherMarkers(validResults);
        updateLastUpdateTime();
    } catch (error) {
        console.error('Error fetching weather data:', error);
        weatherList.innerHTML = `
            <div class="cyclone-card" style="background-color: #fff3cd; color: #856404; border-left: 4px solid #ffeeba;">
                <p><strong>Error fetching weather data:</strong> ${error.message}</p>
                <p>To fix this:</p>
                <ol>
                    <li>Sign up for a free API key at <a href="https://openweathermap.org/api" target="_blank">OpenWeatherMap</a></li>
                    <li>Replace the API_KEY in script.js with your key</li>
                    <li>Wait a few hours for the API key to activate</li>
                </ol>
                <p>The data will automatically refresh in 5 minutes.</p>
            </div>`;
    }
}

// Function to update weather markers
function updateWeatherMarkers(weatherDataArray) {
    const weatherList = document.getElementById('cyclone-list');
    weatherList.innerHTML = '';

    // Clear existing markers
    weatherMarkers.forEach(marker => map.removeLayer(marker));
    weatherMarkers.clear();

    // Sort weather data by wind speed (highest first)
    weatherDataArray.sort((a, b) => (b.wind?.speed || 0) - (a.wind?.speed || 0));

    weatherDataArray.forEach((data, index) => {
        const location = monitoringPoints[index];
        const severity = getWeatherSeverity(data);
        
        // Create marker with custom color
        const marker = L.circleMarker([data.coord.lat, data.coord.lon], {
            radius: 10,
            fillColor: severity.color,
            color: '#000',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
        }).bindPopup(`
            <b>${location.name}</b><br>
            <b>Status: ${severity.level}</b><br>
            <b>Weather: ${data.weather[0].main} - ${data.weather[0].description}</b><br>
            Wind: ${data.wind.speed.toFixed(1)} m/s (${getWindDirection(data.wind.deg)})<br>
            Pressure: ${data.main.pressure} mb<br>
            Temperature: ${data.main.temp.toFixed(1)}°C<br>
            Feels Like: ${data.main.feels_like.toFixed(1)}°C<br>
            Humidity: ${data.main.humidity}%<br>
            Visibility: ${convertVisibility(data.visibility)} km<br>
            Cloud Cover: ${data.clouds.all}%
        `).addTo(map);
        
        weatherMarkers.set(location.name, marker);

        // Create weather info card
        const weatherCard = document.createElement('div');
        weatherCard.className = 'cyclone-card highlight';
        weatherCard.style.borderLeft = `4px solid ${severity.color}`;
        
        const wind_speed = data.wind.speed || 0;
        const severityClass = wind_speed > 32.7 ? 'alert-severe' :
                            wind_speed > 24.5 ? 'alert-high' :
                            wind_speed > 17.2 ? 'alert-moderate' : 'alert-low';

        weatherCard.innerHTML = `
            <h3>${location.name}</h3>
            <div class="severity-indicator ${severityClass}">
                ${severity.level}
            </div>
            <div class="weather-grid">
                <div class="weather-item">
                    <i class="fas fa-wind"></i>
                    <strong>Wind Speed:</strong><br>
                    ${data.wind.speed.toFixed(1)} m/s
                </div>
                <div class="weather-item">
                    <i class="fas fa-compass"></i>
                    <strong>Wind Direction:</strong><br>
                    ${getWindDirection(data.wind.deg)}
                </div>
                <div class="weather-item">
                    <i class="fas fa-temperature-high"></i>
                    <strong>Temperature:</strong><br>
                    ${data.main.temp.toFixed(1)}°C
                </div>
                <div class="weather-item">
                    <i class="fas fa-tachometer-alt"></i>
                    <strong>Pressure:</strong><br>
                    ${data.main.pressure} mb
                </div>
            </div>
            <div class="weather-details">
                <p><i class="fas fa-cloud"></i> <strong>Weather:</strong> ${data.weather[0].main} - ${data.weather[0].description}</p>
                <p><i class="fas fa-thermometer-half"></i> <strong>Feels Like:</strong> ${data.main.feels_like.toFixed(1)}°C</p>
                <p><i class="fas fa-tint"></i> <strong>Humidity:</strong> ${data.main.humidity}%</p>
                <p><i class="fas fa-eye"></i> <strong>Visibility:</strong> ${convertVisibility(data.visibility)} km</p>
                <p><i class="fas fa-cloud-sun"></i> <strong>Cloud Cover:</strong> ${data.clouds.all}%</p>
                <p><i class="fas fa-clock"></i> <strong>Last Updated:</strong> ${new Date(data.dt * 1000).toLocaleString()}</p>
            </div>
            ${severity.level === 'Severe Cyclonic Storm' || severity.level === 'Cyclonic Storm' ? `
                <div class="emergency-info">
                    <h4><i class="fas fa-exclamation-circle"></i> Emergency Alert</h4>
                    <p>Severe weather conditions detected. Please follow safety guidelines and stay tuned for updates.</p>
                    <p><strong>Emergency Helpline:</strong> 1070</p>
                </div>
            ` : ''}
        `;
        
        weatherCard.addEventListener('click', () => {
            map.setView([data.coord.lat, data.coord.lon], 10);
            marker.openPopup();
        });

        weatherList.appendChild(weatherCard);
    });
}

// Fetch data initially and then every 5 minutes
fetchWeatherData();
setInterval(fetchWeatherData, 300000);

// Add a custom control for centering the map
L.Control.Center = L.Control.extend({
    onAdd: function(map) {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        container.innerHTML = `
            <a href="#" title="Center Map" style="
                width: 30px;
                height: 30px;
                line-height: 30px;
                display: block;
                text-align: center;
                text-decoration: none;
                color: black;
                background: white;
                font-weight: bold;
            ">⌖</a>
        `;
        
        container.onclick = function() {
            map.setView([13.0827, 80.2707], 8);
            return false;
        };
        
        return container;
    }
});

new L.Control.Center({ position: 'topleft' }).addTo(map);
