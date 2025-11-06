/**
 * Frontend Weather Service
 * Handles weather API calls directly from the browser
 */

class WeatherService {
    constructor() {
        this.apiKey = process.env.REACT_APP_WEATHER_API_KEY || 'fe3ee8fca7c9cfc98f1306b62991e4e0';
        this.baseUrl = 'https://api.openweathermap.org/data/2.5';
        this.geocodingUrl = 'https://api.openweathermap.org/geo/1.0';
    }

    /**
     * Geocode a location string to coordinates
     */
    async geocodeLocation(location) {
        try {
            const response = await fetch(`${this.geocodingUrl}/direct?q=${encodeURIComponent(location)}&limit=1&appid=${this.apiKey}`);

            if (!response.ok) {
                throw new Error(`Geocoding failed: ${response.status}`);
            }

            const data = await response.json();

            if (!data || data.length === 0) {
                throw new Error(`Location "${location}" not found`);
            }

            const locationData = data[0];
            return {
                name: locationData.name,
                country: locationData.country,
                state: locationData.state,
                coordinates: {
                    lat: locationData.lat,
                    lon: locationData.lon
                }
            };
        } catch (error) {
            throw new Error(`Failed to find location: ${error.message}`);
        }
    }

    /**
     * Get current weather for coordinates
     */
    async getCurrentWeather(lat, lon) {
        try {
            const response = await fetch(`${this.baseUrl}/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`);

            if (!response.ok) {
                throw new Error(`Weather API failed: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            throw new Error(`Failed to get current weather: ${error.message}`);
        }
    }

    /**
     * Get weather forecast for coordinates
     */
    async getWeatherForecast(lat, lon) {
        try {
            const response = await fetch(`${this.baseUrl}/forecast?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`);

            if (!response.ok) {
                throw new Error(`Forecast API failed: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            throw new Error(`Failed to get weather forecast: ${error.message}`);
        }
    }

    /**
     * Get weather for location and date
     */
    async getWeatherForLocationAndDate(location, dateString) {
        try {
            // Geocode location
            const locationData = await this.geocodeLocation(location);

            // Parse date
            const requestedDate = new Date(dateString);
            const now = new Date();
            const daysDifference = Math.ceil((requestedDate - now) / (1000 * 60 * 60 * 24));

            let weatherData;

            if (daysDifference <= 0) {
                // Current or past date
                weatherData = await this.getCurrentWeather(
                    locationData.coordinates.lat,
                    locationData.coordinates.lon
                );
                return this.formatCurrentWeatherResponse(weatherData, locationData, dateString);
            } else if (daysDifference <= 5) {
                // Future date within 5 days
                const forecastData = await this.getWeatherForecast(
                    locationData.coordinates.lat,
                    locationData.coordinates.lon
                );
                return this.formatForecastResponse(forecastData, locationData, dateString, requestedDate);
            } else {
                throw new Error('Weather forecast is only available for the next 5 days');
            }
        } catch (error) {
            throw new Error(`Weather lookup failed: ${error.message}`);
        }
    }

    /**
     * Format current weather response
     */
    formatCurrentWeatherResponse(weatherData, locationData, dateString) {
        return {
            location: {
                name: locationData.name,
                country: locationData.country,
                state: locationData.state,
                coordinates: locationData.coordinates
            },
            date: dateString,
            weather: {
                temperature: {
                    current: Math.round(weatherData.main.temp),
                    feels_like: Math.round(weatherData.main.feels_like),
                    min: Math.round(weatherData.main.temp_min),
                    max: Math.round(weatherData.main.temp_max),
                    unit: 'celsius'
                },
                conditions: {
                    main: weatherData.weather[0].main,
                    description: weatherData.weather[0].description,
                    icon: weatherData.weather[0].icon
                },
                humidity: weatherData.main.humidity,
                pressure: weatherData.main.pressure,
                wind: {
                    speed: weatherData.wind?.speed || 0,
                    direction: weatherData.wind?.deg || 0
                },
                visibility: weatherData.visibility ? Math.round(weatherData.visibility / 1000) : null
            },
            source: 'OpenWeatherMap',
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Format forecast response
     */
    formatForecastResponse(forecastData, locationData, dateString, requestedDate) {
        const targetDate = requestedDate.toISOString().split('T')[0];

        let closestForecast = null;
        let minTimeDiff = Infinity;

        for (const forecast of forecastData.list) {
            const forecastDate = new Date(forecast.dt * 1000);
            const forecastDateString = forecastDate.toISOString().split('T')[0];

            if (forecastDateString === targetDate) {
                const timeDiff = Math.abs(forecastDate.getHours() - 12);
                if (timeDiff < minTimeDiff) {
                    minTimeDiff = timeDiff;
                    closestForecast = forecast;
                }
            }
        }

        if (!closestForecast) {
            closestForecast = forecastData.list[0];
        }

        return {
            location: {
                name: locationData.name,
                country: locationData.country,
                state: locationData.state,
                coordinates: locationData.coordinates
            },
            date: dateString,
            weather: {
                temperature: {
                    current: Math.round(closestForecast.main.temp),
                    feels_like: Math.round(closestForecast.main.feels_like),
                    min: Math.round(closestForecast.main.temp_min),
                    max: Math.round(closestForecast.main.temp_max),
                    unit: 'celsius'
                },
                conditions: {
                    main: closestForecast.weather[0].main,
                    description: closestForecast.weather[0].description,
                    icon: closestForecast.weather[0].icon
                },
                humidity: closestForecast.main.humidity,
                pressure: closestForecast.main.pressure,
                wind: {
                    speed: closestForecast.wind?.speed || 0,
                    direction: closestForecast.wind?.deg || 0
                },
                visibility: closestForecast.visibility ? Math.round(closestForecast.visibility / 1000) : null
            },
            source: 'OpenWeatherMap',
            timestamp: new Date().toISOString()
        };
    }
}

const weatherService = new WeatherService();
export default weatherService;