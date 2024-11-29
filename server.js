const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.static(path.join(__dirname)));

// Proxy endpoint for weather data
app.get('/weather', async (req, res) => {
    try {
        const { lat, lon } = req.query;
        const API_KEY = '3df9b6be33a14bdeb448bc8fbf22d6d7';
        const response = await axios.get(`https://api.weatherbit.io/v2.0/current?key=${API_KEY}&lat=${lat}&lon=${lon}&include=minutely`);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching weather data:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch weather data' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
