/**
 * Weather Context Service
 * Orchestrates weather context gathering for the AI outfit planning pipeline
 * Leverages existing weatherService and integrates with contextAccumulator
 */

import weatherService from './weatherService.js';
import contextAccumulator from './contextAccumulator.js';

class WeatherContextService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 60 * 60 * 1000; // 1 hour cache duration
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second initial delay
    }

    /**
     * Gather comprehensive weather context for event details
     * @param {Object} eventDetails - Event details from extraction service
     * @param {string} sessionId - Session identifier for context accumulation
     * @returns {Promise<Object>} Weather context gathering result
     */
    async gatherWeatherContext(eventDetails, sessionId) {
        try {
            // Validate inputs
            if (!eventDetails) {
                throw new Error('Event details are required');
            }

            if (!sessionId) {
                throw new Error('Session ID is required');
            }

            // Process location and dates from event details
            const { location, dateRange } = await this.processLocationAndDates(eventDetails);

            // Gather weather data for all dates in the event duration
            const weatherData = await this.gatherMultiDayWeatherData(location, dateRange);

            // Enrich event context with weather information
            const enrichedContext = await this.enrichEventContext(eventDetails, weatherData, location);

            // Add weather context to accumulated context file
            await this.addWeatherContextToAccumulator(sessionId, enrichedContext);

            return {
                success: true,
                weatherContext: enrichedContext,
                location: location,
                dateRange: dateRange,
                dataSource: 'OpenWeatherMap',
                gatheredAt: new Date().toISOString()
            };

        } catch (error) {
            console.error('Weather context gathering failed:', error);

            // Attempt fallback with seasonal averages
            try {
                const fallbackContext = await this.provideFallbackWeatherContext(eventDetails, sessionId);
                return {
                    success: true,
                    weatherContext: fallbackContext,
                    fallbackUsed: true,
                    error: error.message,
                    gatheredAt: new Date().toISOString()
                };
            } catch (fallbackError) {
                return {
                    success: false,
                    error: error.message,
                    fallbackError: fallbackError.message,
                    gatheredAt: new Date().toISOString()
                };
            }
        }
    }

    /**
     * Process location and dates from event details
     * @param {Object} eventDetails - Event details containing location and date information
     * @returns {Promise<Object>} Processed location and date range
     */
    async processLocationAndDates(eventDetails) {
        // Extract and validate location
        const locationString = eventDetails.location;
        if (!locationString) {
            throw new Error('Location is required for weather context gathering');
        }

        // Resolve location to coordinates
        const location = await this.resolveLocation(locationString);

        // Process dates and duration
        const dateRange = this.calculateDateRange(eventDetails.startDate, eventDetails.duration || 1);

        return { location, dateRange };
    }

    /**
     * Resolve location string to coordinates and location data
     * @param {string} locationString - Location string to resolve
     * @returns {Promise<Object>} Resolved location with coordinates
     */
    async resolveLocation(locationString) {
        try {
            const locationData = await weatherService.geocodeLocation(locationString);

            return {
                name: locationData.name,
                country: locationData.country,
                state: locationData.state,
                coordinates: locationData.coordinates,
                timezone: null, // Could be enhanced with timezone lookup
                resolvedFrom: locationString
            };
        } catch (error) {
            throw new Error(`Failed to resolve location "${locationString}": ${error.message}`);
        }
    }

    /**
     * Calculate date range for weather data gathering
     * @param {string} startDate - Start date string (YYYY-MM-DD)
     * @param {number} duration - Duration in days
     * @returns {Object} Date range with start and end dates
     */
    calculateDateRange(startDate, duration) {
        let start, end;

        if (startDate) {
            start = new Date(startDate);
            if (isNaN(start.getTime())) {
                throw new Error(`Invalid start date: ${startDate}`);
            }
        } else {
            // Default to today if no start date provided
            start = new Date();
        }

        // Calculate end date based on duration
        end = new Date(start);
        end.setDate(start.getDate() + (duration - 1));

        // Validate date range is within forecast limits (14 days)
        const now = new Date();
        const daysDifference = Math.ceil((end - now) / (1000 * 60 * 60 * 24));

        if (daysDifference > 14) {
            console.warn(`Weather forecast requested for ${daysDifference} days ahead. Limited to 14 days.`);
            end = new Date(now);
            end.setDate(now.getDate() + 14);
        }

        return {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0],
            duration: Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
        };
    }

    /**
     * Gather weather data for multiple days
     * @param {Object} location - Location with coordinates
     * @param {Object} dateRange - Date range for weather data
     * @returns {Promise<Array>} Array of daily weather forecasts
     */
    async gatherMultiDayWeatherData(location, dateRange) {
        const dailyForecasts = [];
        const { lat, lon } = location.coordinates;

        // Generate array of dates to fetch weather for
        const dates = this.generateDateArray(dateRange.start, dateRange.end);

        // Fetch weather data for each date
        for (const date of dates) {
            try {
                const cacheKey = `${lat},${lon},${date}`;

                // Check cache first
                let weatherData = this.getCachedWeatherData(cacheKey);

                if (!weatherData) {
                    // Fetch from weather service with retry logic
                    weatherData = await this.fetchWeatherWithRetry(location.name, date);

                    // Cache the result
                    this.cacheWeatherData(cacheKey, weatherData);
                }

                // Process and standardize weather data
                const processedWeather = this.processWeatherData(weatherData, date);
                dailyForecasts.push(processedWeather);

            } catch (error) {
                console.warn(`Failed to get weather for ${date}:`, error.message);

                // Add fallback weather data for this date
                const fallbackWeather = this.generateFallbackWeatherData(date, location);
                dailyForecasts.push(fallbackWeather);
            }
        }

        return dailyForecasts;
    }

    /**
     * Generate array of date strings between start and end dates
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     * @returns {Array<string>} Array of date strings
     */
    generateDateArray(startDate, endDate) {
        const dates = [];
        const start = new Date(startDate);
        const end = new Date(endDate);

        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            dates.push(date.toISOString().split('T')[0]);
        }

        return dates;
    }

    /**
     * Fetch weather data with retry logic
     * @param {string} location - Location name
     * @param {string} date - Date string
     * @returns {Promise<Object>} Weather data
     */
    async fetchWeatherWithRetry(location, date) {
        let lastError;

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                return await weatherService.getWeatherForLocationAndDate(location, date);
            } catch (error) {
                lastError = error;

                if (attempt < this.maxRetries) {
                    // Exponential backoff
                    const delay = this.retryDelay * Math.pow(2, attempt - 1);
                    await this.sleep(delay);
                }
            }
        }

        throw lastError;
    }

    /**
     * Process raw weather data into standardized format
     * @param {Object} weatherData - Raw weather data from service
     * @param {string} date - Date string
     * @returns {Object} Processed weather data
     */
    processWeatherData(weatherData, date) {
        const weather = weatherData.weather;

        // Enhanced weather data processing with better error handling
        const processedData = {
            date: date,
            temperature: {
                min: weather.temperature?.min || weather.temperature?.current || 15,
                max: weather.temperature?.max || weather.temperature?.current || 25,
                average: Math.round((
                    (weather.temperature?.min || weather.temperature?.current || 15) +
                    (weather.temperature?.max || weather.temperature?.current || 25)
                ) / 2),
                feelsLike: weather.temperature?.feels_like || weather.temperature?.current || 20,
                unit: weather.temperature?.unit || 'celsius'
            },
            conditions: {
                main: this.categorizeWeatherCondition(weather.conditions?.main || 'Clear'),
                description: weather.conditions?.description || 'Clear conditions',
                precipitation: {
                    probability: this.estimatePrecipitationProbability(weather.conditions?.main || 'Clear'),
                    amount: weather.conditions?.precipitation?.amount || null
                },
                wind: {
                    speed: weather.wind?.speed || 0,
                    direction: this.getWindDirection(weather.wind?.direction || 0)
                },
                humidity: weather.humidity || 50,
                uvIndex: weather.uvIndex || null,
                visibility: weather.visibility || null,
                pressure: weather.pressure || null
            }
        };

        // Calculate enhanced comfort indices
        processedData.comfort = this.calculateComfortIndices(weather);

        // Generate comprehensive weather recommendations
        processedData.recommendations = this.generateWeatherRecommendations(weather);

        // Add weather quality assessment
        processedData.weatherQuality = this.assessWeatherQuality(processedData);

        return processedData;
    }

    /**
     * Assess overall weather quality for outfit planning
     * @param {Object} weatherData - Processed weather data
     * @returns {Object} Weather quality assessment
     */
    assessWeatherQuality(weatherData) {
        let score = 100; // Start with perfect score
        let factors = [];
        let challenges = [];
        let advantages = [];

        const temp = weatherData.temperature.average;
        const condition = weatherData.conditions.main;
        const windSpeed = weatherData.conditions.wind.speed;
        const humidity = weatherData.conditions.humidity;
        const precipProb = weatherData.conditions.precipitation.probability;

        // Temperature assessment
        if (temp >= 18 && temp <= 26) {
            advantages.push('comfortable temperature range');
        } else if (temp < 5 || temp > 35) {
            score -= 30;
            challenges.push('extreme temperature');
            factors.push('temperature extremes require special clothing');
        } else if (temp < 10 || temp > 30) {
            score -= 15;
            challenges.push('challenging temperature');
            factors.push('temperature requires careful clothing selection');
        }

        // Precipitation assessment
        if (precipProb > 70) {
            score -= 25;
            challenges.push('high precipitation probability');
            factors.push('rain protection essential');
        } else if (precipProb > 40) {
            score -= 10;
            challenges.push('moderate precipitation risk');
            factors.push('consider rain protection');
        } else if (precipProb < 20) {
            advantages.push('low precipitation risk');
        }

        // Wind assessment
        if (windSpeed > 20) {
            score -= 20;
            challenges.push('strong winds');
            factors.push('wind-resistant clothing needed');
        } else if (windSpeed > 10) {
            score -= 5;
            challenges.push('moderate winds');
            factors.push('consider wind effects on clothing');
        } else if (windSpeed < 5) {
            advantages.push('calm wind conditions');
        }

        // Humidity assessment
        if (humidity > 80 && temp > 20) {
            score -= 15;
            challenges.push('high humidity');
            factors.push('breathable fabrics important');
        } else if (humidity < 20) {
            score -= 5;
            challenges.push('low humidity');
            factors.push('skin and fabric care needed');
        } else if (humidity >= 40 && humidity <= 60) {
            advantages.push('comfortable humidity levels');
        }

        // Condition-specific assessment
        if (condition === 'sunny') {
            advantages.push('clear, sunny conditions');
            if (temp > 25) {
                factors.push('sun protection recommended');
            }
        } else if (condition === 'rainy') {
            score -= 20;
            challenges.push('wet conditions');
            factors.push('waterproof clothing essential');
        } else if (condition === 'snowy') {
            score -= 25;
            challenges.push('snow conditions');
            factors.push('warm, waterproof clothing needed');
        }

        // Determine overall rating
        let rating;
        if (score >= 80) rating = 'excellent';
        else if (score >= 60) rating = 'good';
        else if (score >= 40) rating = 'fair';
        else if (score >= 20) rating = 'challenging';
        else rating = 'difficult';

        return {
            score: Math.max(score, 0),
            rating,
            advantages,
            challenges,
            factors,
            outfitComplexity: challenges.length > 2 ? 'high' : challenges.length > 0 ? 'moderate' : 'low'
        };
    }

    /**
     * Categorize weather conditions into standardized descriptors
     * @param {string} condition - Weather condition from API
     * @returns {string} Standardized weather condition
     */
    categorizeWeatherCondition(condition) {
        // Enhanced condition mapping with more comprehensive coverage
        const conditionMap = {
            // Clear conditions
            'Clear': 'sunny',
            'clear sky': 'sunny',
            'few clouds': 'sunny',

            // Cloudy conditions
            'Clouds': 'cloudy',
            'scattered clouds': 'cloudy',
            'broken clouds': 'cloudy',
            'overcast clouds': 'cloudy',
            'partly cloudy': 'cloudy',

            // Rainy conditions
            'Rain': 'rainy',
            'light rain': 'rainy',
            'moderate rain': 'rainy',
            'heavy intensity rain': 'rainy',
            'very heavy rain': 'rainy',
            'extreme rain': 'rainy',
            'freezing rain': 'rainy',
            'light intensity shower rain': 'rainy',
            'shower rain': 'rainy',
            'heavy intensity shower rain': 'rainy',
            'ragged shower rain': 'rainy',

            // Drizzle conditions
            'Drizzle': 'rainy',
            'light intensity drizzle': 'rainy',
            'drizzle': 'rainy',
            'heavy intensity drizzle': 'rainy',
            'light intensity drizzle rain': 'rainy',
            'drizzle rain': 'rainy',
            'heavy intensity drizzle rain': 'rainy',
            'shower rain and drizzle': 'rainy',
            'heavy shower rain and drizzle': 'rainy',
            'shower drizzle': 'rainy',

            // Thunderstorm conditions
            'Thunderstorm': 'rainy',
            'thunderstorm with light rain': 'rainy',
            'thunderstorm with rain': 'rainy',
            'thunderstorm with heavy rain': 'rainy',
            'light thunderstorm': 'rainy',
            'thunderstorm': 'rainy',
            'heavy thunderstorm': 'rainy',
            'ragged thunderstorm': 'rainy',
            'thunderstorm with light drizzle': 'rainy',
            'thunderstorm with drizzle': 'rainy',
            'thunderstorm with heavy drizzle': 'rainy',

            // Snow conditions
            'Snow': 'snowy',
            'light snow': 'snowy',
            'snow': 'snowy',
            'heavy snow': 'snowy',
            'sleet': 'snowy',
            'light shower sleet': 'snowy',
            'shower sleet': 'snowy',
            'light rain and snow': 'snowy',
            'rain and snow': 'snowy',
            'light shower snow': 'snowy',
            'shower snow': 'snowy',
            'heavy shower snow': 'snowy',

            // Atmospheric conditions
            'Mist': 'cloudy',
            'Smoke': 'cloudy',
            'Haze': 'cloudy',
            'sand/dust whirls': 'windy',
            'Fog': 'cloudy',
            'Sand': 'windy',
            'Dust': 'windy',
            'volcanic ash': 'cloudy',
            'Squalls': 'windy',
            'Tornado': 'windy'
        };

        // Try exact match first
        if (conditionMap[condition]) {
            return conditionMap[condition];
        }

        // Try case-insensitive match
        const lowerCondition = condition.toLowerCase();
        for (const [key, value] of Object.entries(conditionMap)) {
            if (key.toLowerCase() === lowerCondition) {
                return value;
            }
        }

        // Try partial match for complex descriptions
        if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle') || lowerCondition.includes('storm')) {
            return 'rainy';
        }
        if (lowerCondition.includes('snow') || lowerCondition.includes('sleet')) {
            return 'snowy';
        }
        if (lowerCondition.includes('clear') || lowerCondition.includes('sun')) {
            return 'sunny';
        }
        if (lowerCondition.includes('wind') || lowerCondition.includes('gust')) {
            return 'windy';
        }

        // Default fallback
        return 'cloudy';
    }

    /**
     * Estimate precipitation probability based on weather condition
     * @param {string} condition - Weather condition
     * @returns {number} Precipitation probability (0-100)
     */
    estimatePrecipitationProbability(condition) {
        const probabilityMap = {
            'Clear': 0,
            'Clouds': 20,
            'Rain': 90,
            'Drizzle': 70,
            'Thunderstorm': 95,
            'Snow': 85,
            'Mist': 30,
            'Fog': 25,
            'Haze': 10
        };

        return probabilityMap[condition] || 30;
    }

    /**
     * Convert wind direction degrees to cardinal direction
     * @param {number} degrees - Wind direction in degrees
     * @returns {string} Cardinal direction
     */
    getWindDirection(degrees) {
        const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        const index = Math.round(degrees / 22.5) % 16;
        return directions[index];
    }

    /**
     * Calculate comfort indices from weather data
     * @param {Object} weather - Weather data
     * @returns {Object} Comfort indices
     */
    calculateComfortIndices(weather) {
        // Use average temperature if current not available
        const temp = weather.temperature.current || weather.temperature.feels_like ||
            ((weather.temperature.min + weather.temperature.max) / 2);
        const humidity = weather.humidity || 50; // Default humidity if not available
        const windSpeed = weather.wind.speed || 0; // Default wind speed if not available

        // Enhanced heat index calculation (Steadman's formula)
        let heatIndex = null;
        if (temp >= 27 && humidity >= 40) {
            // Convert to Fahrenheit for calculation if needed
            const tempF = temp * 9 / 5 + 32;
            const rh = humidity;

            // Steadman's heat index formula
            let hi = -42.379 + 2.04901523 * tempF + 10.14333127 * rh
                - 0.22475541 * tempF * rh - 6.83783e-3 * tempF * tempF
                - 5.481717e-2 * rh * rh + 1.22874e-3 * tempF * tempF * rh
                + 8.5282e-4 * tempF * rh * rh - 1.99e-6 * tempF * tempF * rh * rh;

            // Convert back to Celsius
            heatIndex = Math.round((hi - 32) * 5 / 9);

            // Ensure heat index is not lower than actual temperature
            heatIndex = Math.max(heatIndex, temp);
        }

        // Enhanced wind chill calculation (North American formula)
        let windChill = null;
        if (temp <= 10 && windSpeed >= 4.8) { // 4.8 km/h minimum wind speed
            // Convert wind speed to km/h if needed (assuming m/s input)
            const windKmh = windSpeed * 3.6;

            // Wind chill formula
            windChill = 13.12 + 0.6215 * temp - 11.37 * Math.pow(windKmh, 0.16)
                + 0.3965 * temp * Math.pow(windKmh, 0.16);
            windChill = Math.round(windChill);

            // Ensure wind chill is not higher than actual temperature
            windChill = Math.min(windChill, temp);
        }

        // Enhanced comfort level determination
        let comfortLevel = 'comfortable';
        let comfortFactors = [];

        // Heat-related discomfort
        if (heatIndex && heatIndex > 32) {
            comfortLevel = 'hot';
            comfortFactors.push('high heat index');
        } else if (temp > 30) {
            comfortLevel = 'hot';
            comfortFactors.push('high temperature');
        }

        // Cold-related discomfort
        if (windChill && windChill < 0) {
            comfortLevel = 'cold';
            comfortFactors.push('wind chill effect');
        } else if (temp < 5) {
            comfortLevel = 'cold';
            comfortFactors.push('low temperature');
        }

        // Humidity-related discomfort
        if (humidity > 80 && temp > 20) {
            if (comfortLevel === 'comfortable') {
                comfortLevel = 'humid';
            }
            comfortFactors.push('high humidity');
        } else if (humidity < 20) {
            comfortFactors.push('low humidity');
        }

        // Wind-related discomfort
        if (windSpeed > 15) {
            comfortFactors.push('strong winds');
        }

        // Calculate apparent temperature (feels like)
        let apparentTemperature = temp;
        if (heatIndex) {
            apparentTemperature = heatIndex;
        } else if (windChill) {
            apparentTemperature = windChill;
        }

        // Calculate discomfort index
        const discomfortIndex = this.calculateDiscomfortIndex(temp, humidity);

        return {
            heatIndex,
            windChill,
            apparentTemperature,
            comfortLevel,
            comfortFactors,
            discomfortIndex,
            humidityComfort: this.getHumidityComfortLevel(humidity),
            temperatureComfort: this.getTemperatureComfortLevel(temp),
            windComfort: this.getWindComfortLevel(windSpeed)
        };
    }

    /**
     * Calculate discomfort index based on temperature and humidity
     * @param {number} temp - Temperature in Celsius
     * @param {number} humidity - Relative humidity percentage
     * @returns {Object} Discomfort index information
     */
    calculateDiscomfortIndex(temp, humidity) {
        // Thom's Discomfort Index
        const di = temp - (0.55 - 0.0055 * humidity) * (temp - 14.5);

        let level, description;
        if (di < 21) {
            level = 'comfortable';
            description = 'No discomfort';
        } else if (di < 24) {
            level = 'slight';
            description = 'Less than 50% feel discomfort';
        } else if (di < 27) {
            level = 'moderate';
            description = 'More than 50% feel discomfort';
        } else if (di < 29) {
            level = 'severe';
            description = 'Most people feel discomfort';
        } else if (di < 32) {
            level = 'extreme';
            description = 'Everyone feels severe stress';
        } else {
            level = 'dangerous';
            description = 'State of medical emergency';
        }

        return {
            value: Math.round(di * 10) / 10,
            level,
            description
        };
    }

    /**
     * Get humidity comfort level
     * @param {number} humidity - Relative humidity percentage
     * @returns {string} Humidity comfort level
     */
    getHumidityComfortLevel(humidity) {
        if (humidity < 20) return 'too dry';
        if (humidity < 30) return 'dry';
        if (humidity < 60) return 'comfortable';
        if (humidity < 80) return 'humid';
        return 'very humid';
    }

    /**
     * Get temperature comfort level
     * @param {number} temp - Temperature in Celsius
     * @returns {string} Temperature comfort level
     */
    getTemperatureComfortLevel(temp) {
        if (temp < 0) return 'freezing';
        if (temp < 10) return 'cold';
        if (temp < 18) return 'cool';
        if (temp < 26) return 'comfortable';
        if (temp < 32) return 'warm';
        return 'hot';
    }

    /**
     * Get wind comfort level
     * @param {number} windSpeed - Wind speed in m/s
     * @returns {string} Wind comfort level
     */
    getWindComfortLevel(windSpeed) {
        if (windSpeed < 2) return 'calm';
        if (windSpeed < 6) return 'light breeze';
        if (windSpeed < 12) return 'moderate breeze';
        if (windSpeed < 20) return 'strong breeze';
        return 'strong winds';
    }

    /**
     * Generate weather-based clothing recommendations
     * @param {Object} weather - Weather data
     * @returns {Object} Clothing recommendations
     */
    generateWeatherRecommendations(weather) {
        // Use average temperature if current not available
        const temp = weather.temperature.current || weather.temperature.feels_like ||
            ((weather.temperature.min + weather.temperature.max) / 2);
        const minTemp = weather.temperature.min || temp;
        const maxTemp = weather.temperature.max || temp;
        const condition = weather.conditions.main;
        const windSpeed = weather.wind.speed || 0;
        const humidity = weather.humidity || 50;
        const precipitationProb = weather.conditions.precipitation?.probability || 0;

        // Enhanced layering recommendations based on temperature range and conditions
        let layering = 'none';
        let layeringDetails = [];

        if (minTemp < 0) {
            layering = 'heavy';
            layeringDetails = ['thermal base layer', 'insulating mid layer', 'warm outer layer'];
        } else if (minTemp < 5) {
            layering = 'heavy';
            layeringDetails = ['warm base layer', 'insulating layer', 'outer jacket'];
        } else if (minTemp < 10) {
            layering = 'moderate';
            layeringDetails = ['base layer', 'warm sweater/jacket'];
        } else if (minTemp < 15 || (maxTemp - minTemp) > 10) {
            layering = 'light';
            layeringDetails = ['light layers for temperature variation'];
        } else if (maxTemp > 25) {
            layering = 'none';
            layeringDetails = ['lightweight, breathable clothing'];
        } else {
            layering = 'light';
            layeringDetails = ['comfortable single layer or light cardigan'];
        }

        // Enhanced waterproof recommendations
        const needsWaterproof = this.assessWaterproofNeeds(condition, precipitationProb, windSpeed);

        // Enhanced sun protection recommendations
        const needsSunProtection = this.assessSunProtectionNeeds(condition, temp, humidity);

        // Enhanced warm accessories recommendations
        const needsWarmAccessories = this.assessWarmAccessoriesNeeds(temp, windSpeed, condition);

        // Footwear recommendations
        const footwearRecommendations = this.getFootwearRecommendations(condition, temp, precipitationProb);

        // Fabric recommendations
        const fabricRecommendations = this.getFabricRecommendations(temp, humidity, condition, windSpeed);

        // Color recommendations based on weather
        const colorRecommendations = this.getColorRecommendations(condition, temp);

        // Activity-specific adjustments
        const activityAdjustments = this.getActivityAdjustments(weather);

        return {
            layering,
            layeringDetails,
            waterproof: needsWaterproof.needed,
            waterproofDetails: needsWaterproof.details,
            sunProtection: needsSunProtection.needed,
            sunProtectionDetails: needsSunProtection.details,
            warmAccessories: needsWarmAccessories.needed,
            warmAccessoriesDetails: needsWarmAccessories.details,
            footwear: footwearRecommendations,
            fabrics: fabricRecommendations,
            colors: colorRecommendations,
            activityAdjustments,
            comfortTips: this.getComfortTips(weather)
        };
    }

    /**
     * Assess waterproof clothing needs
     * @param {string} condition - Weather condition
     * @param {number} precipitationProb - Precipitation probability
     * @param {number} windSpeed - Wind speed
     * @returns {Object} Waterproof assessment
     */
    assessWaterproofNeeds(condition, precipitationProb, windSpeed) {
        const rainConditions = ['rainy', 'Rain', 'Drizzle', 'Thunderstorm'];
        const snowConditions = ['snowy', 'Snow'];

        let needed = false;
        let details = [];
        let urgency = 'low';

        if (rainConditions.some(c => condition.includes(c) || condition === c)) {
            needed = true;
            urgency = 'high';
            details.push('rain protection essential');

            if (windSpeed > 10) {
                details.push('wind-resistant rain gear recommended');
            }
        } else if (snowConditions.some(c => condition.includes(c) || condition === c)) {
            needed = true;
            urgency = 'high';
            details.push('snow protection needed');
            details.push('waterproof boots essential');
        } else if (precipitationProb > 60) {
            needed = true;
            urgency = 'medium';
            details.push('high chance of precipitation');
            details.push('carry umbrella or light rain jacket');
        } else if (precipitationProb > 30) {
            needed = false;
            urgency = 'low';
            details.push('consider bringing light rain protection');
        }

        return { needed, details, urgency };
    }

    /**
     * Assess sun protection needs
     * @param {string} condition - Weather condition
     * @param {number} temp - Temperature
     * @param {number} humidity - Humidity
     * @returns {Object} Sun protection assessment
     */
    assessSunProtectionNeeds(condition, temp, humidity) {
        let needed = false;
        let details = [];
        let urgency = 'low';

        if (condition === 'sunny' || condition === 'Clear') {
            if (temp > 25) {
                needed = true;
                urgency = 'high';
                details.push('strong sun protection needed');
                details.push('sunscreen, hat, sunglasses recommended');

                if (humidity < 40) {
                    details.push('extra hydration important in dry heat');
                }
            } else if (temp > 20) {
                needed = true;
                urgency = 'medium';
                details.push('moderate sun protection recommended');
                details.push('sunglasses and light hat suggested');
            }
        } else if (condition === 'cloudy' && temp > 22) {
            needed = true;
            urgency = 'low';
            details.push('UV rays can penetrate clouds');
            details.push('light sun protection still beneficial');
        }

        // High altitude or snow reflection considerations
        if (condition === 'snowy') {
            needed = true;
            urgency = 'medium';
            details.push('snow reflects UV rays');
            details.push('sunglasses essential to prevent snow blindness');
        }

        return { needed, details, urgency };
    }

    /**
     * Assess warm accessories needs
     * @param {number} temp - Temperature
     * @param {number} windSpeed - Wind speed
     * @param {string} condition - Weather condition
     * @returns {Object} Warm accessories assessment
     */
    assessWarmAccessoriesNeeds(temp, windSpeed, condition) {
        let needed = false;
        let details = [];
        let accessories = [];

        if (temp < 5) {
            needed = true;
            accessories.push('warm hat', 'insulated gloves', 'scarf');
            details.push('extremities lose heat quickly in cold weather');
        } else if (temp < 10) {
            needed = true;
            accessories.push('light hat', 'gloves');
            details.push('protect hands and head from cold');
        } else if (windSpeed > 15) {
            needed = true;
            accessories.push('wind-resistant hat');
            details.push('strong winds increase heat loss');
        } else if (temp < 15 && windSpeed > 10) {
            needed = true;
            accessories.push('light scarf or neck warmer');
            details.push('wind chill makes it feel colder');
        }

        // Special conditions
        if (condition === 'snowy') {
            needed = true;
            if (!accessories.includes('insulated gloves')) {
                accessories.push('waterproof gloves');
            }
            details.push('keep extremities dry and warm in snow');
        }

        return { needed, details, accessories };
    }

    /**
     * Get footwear recommendations
     * @param {string} condition - Weather condition
     * @param {number} temp - Temperature
     * @param {number} precipitationProb - Precipitation probability
     * @returns {Object} Footwear recommendations
     */
    getFootwearRecommendations(condition, temp, precipitationProb) {
        let primary = [];
        let avoid = [];
        let details = [];

        if (condition === 'rainy' || precipitationProb > 60) {
            primary.push('waterproof boots', 'rain boots');
            avoid.push('canvas shoes', 'suede footwear');
            details.push('keep feet dry to maintain comfort');
        } else if (condition === 'snowy') {
            primary.push('insulated waterproof boots', 'snow boots');
            avoid.push('thin-soled shoes', 'open-toe footwear');
            details.push('traction and insulation essential for snow');
        } else if (temp > 25) {
            primary.push('breathable sneakers', 'sandals', 'lightweight shoes');
            avoid.push('heavy boots', 'non-breathable materials');
            details.push('prioritize ventilation in hot weather');
        } else if (temp < 5) {
            primary.push('insulated boots', 'warm lined shoes');
            avoid.push('thin shoes', 'mesh sneakers');
            details.push('insulation important for cold weather');
        } else {
            primary.push('comfortable walking shoes', 'sneakers');
            details.push('standard footwear appropriate');
        }

        return { primary, avoid, details };
    }

    /**
     * Get fabric recommendations
     * @param {number} temp - Temperature
     * @param {number} humidity - Humidity
     * @param {string} condition - Weather condition
     * @param {number} windSpeed - Wind speed
     * @returns {Object} Fabric recommendations
     */
    getFabricRecommendations(temp, humidity, condition, windSpeed) {
        let recommended = [];
        let avoid = [];
        let details = [];

        if (temp > 25 || humidity > 70) {
            recommended.push('cotton', 'linen', 'moisture-wicking synthetics', 'bamboo');
            avoid.push('heavy wool', 'polyester without moisture-wicking', 'thick fabrics');
            details.push('breathable fabrics help with heat and humidity');
        } else if (temp < 10) {
            recommended.push('wool', 'fleece', 'down insulation', 'thermal fabrics');
            avoid.push('cotton in base layers', 'thin materials');
            details.push('insulating fabrics retain body heat');
        } else if (condition === 'rainy') {
            recommended.push('quick-dry synthetics', 'merino wool', 'waterproof outer layers');
            avoid.push('cotton', 'materials that stay wet');
            details.push('avoid fabrics that retain moisture');
        } else if (windSpeed > 10) {
            recommended.push('tightly woven fabrics', 'wind-resistant materials');
            avoid.push('loose knits', 'open-weave fabrics');
            details.push('wind-resistant fabrics prevent heat loss');
        } else {
            recommended.push('cotton', 'cotton blends', 'comfortable natural fibers');
            details.push('standard comfortable fabrics suitable');
        }

        return { recommended, avoid, details };
    }

    /**
     * Get color recommendations based on weather
     * @param {string} condition - Weather condition
     * @param {number} temp - Temperature
     * @returns {Object} Color recommendations
     */
    getColorRecommendations(condition, temp) {
        let recommended = [];
        let avoid = [];
        let details = [];

        if (condition === 'sunny' && temp > 25) {
            recommended.push('light colors', 'white', 'pastels', 'reflective colors');
            avoid.push('dark colors', 'black');
            details.push('light colors reflect heat and keep you cooler');
        } else if (temp < 5) {
            recommended.push('dark colors', 'deep tones');
            avoid.push('very light colors that show dirt easily');
            details.push('dark colors absorb heat from sun');
        } else if (condition === 'rainy') {
            recommended.push('darker colors', 'patterns that hide water spots');
            avoid.push('light colors that show water stains');
            details.push('practical colors for wet conditions');
        } else {
            recommended.push('any colors based on personal preference');
            details.push('weather does not significantly impact color choice');
        }

        return { recommended, avoid, details };
    }

    /**
     * Get activity-specific adjustments
     * @param {Object} weather - Weather data
     * @returns {Array} Activity adjustments
     */
    getActivityAdjustments(weather) {
        const adjustments = [];
        const temp = weather.temperature.current || ((weather.temperature.min + weather.temperature.max) / 2);
        const condition = weather.conditions.main;
        const windSpeed = weather.wind.speed || 0;

        if (temp > 25) {
            adjustments.push('Consider lighter clothing if active outdoors');
            adjustments.push('Increase hydration for outdoor activities');
        }

        if (condition === 'rainy') {
            adjustments.push('Plan for indoor alternatives');
            adjustments.push('Waterproof gear essential for outdoor activities');
        }

        if (windSpeed > 15) {
            adjustments.push('Secure loose clothing and accessories');
            adjustments.push('Consider wind-resistant outer layers');
        }

        if (temp < 5) {
            adjustments.push('Limit time outdoors');
            adjustments.push('Layer up more for outdoor activities');
        }

        return adjustments;
    }

    /**
     * Get comfort tips based on weather
     * @param {Object} weather - Weather data
     * @returns {Array} Comfort tips
     */
    getComfortTips(weather) {
        const tips = [];
        const temp = weather.temperature.current || ((weather.temperature.min + weather.temperature.max) / 2);
        const condition = weather.conditions.main;
        const humidity = weather.humidity || 50;
        const windSpeed = weather.wind.speed || 0;

        if (humidity > 70 && temp > 20) {
            tips.push('Choose breathable fabrics to manage moisture');
            tips.push('Avoid tight-fitting clothes in humid conditions');
        }

        if (temp < 10 && windSpeed > 10) {
            tips.push('Cover exposed skin to prevent wind chill');
            tips.push('Layer clothing to trap warm air');
        }

        if (condition === 'sunny' && temp > 25) {
            tips.push('Seek shade during peak sun hours (10am-4pm)');
            tips.push('Wear a wide-brimmed hat for face protection');
        }

        if (condition === 'rainy') {
            tips.push('Keep a change of socks if feet might get wet');
            tips.push('Waterproof your electronics and important items');
        }

        return tips;
    }

    /**
     * Enrich event context with weather information
     * @param {Object} eventDetails - Original event details
     * @param {Array} weatherData - Daily weather forecasts
     * @param {Object} location - Location information
     * @returns {Promise<Object>} Enriched event context
     */
    async enrichEventContext(eventDetails, weatherData, location) {
        // Generate weather summary
        const summary = this.generateWeatherSummary(weatherData);

        // Create enriched context structure
        const enrichedContext = {
            // Original event details
            ...eventDetails,

            // Weather context
            weatherContext: {
                location: location,
                dailyForecasts: weatherData,
                summary: summary
            },

            // Context metadata
            contextGatheredAt: new Date().toISOString(),
            weatherDataSource: 'OpenWeatherMap',
            weatherDataConfidence: this.calculateWeatherConfidence(weatherData)
        };

        return enrichedContext;
    }

    /**
     * Generate weather summary for multiple days
     * @param {Array} weatherData - Daily weather forecasts
     * @returns {Object} Weather summary
     */
    generateWeatherSummary(weatherData) {
        if (!weatherData || weatherData.length === 0) {
            return null;
        }

        // Calculate temperature range across all days
        const temperatures = weatherData.map(day => ({
            min: day.temperature.min,
            max: day.temperature.max
        }));

        const overallMin = Math.min(...temperatures.map(t => t.min));
        const overallMax = Math.max(...temperatures.map(t => t.max));

        // Determine overall conditions
        const conditions = weatherData.map(day => day.conditions.main);
        const overallConditions = this.getMostFrequentCondition(conditions);

        // Check for significant weather changes
        const significantWeatherChanges = this.hasSignificantWeatherChanges(weatherData);

        // Identify primary concerns
        const primaryConcerns = this.identifyPrimaryConcerns(weatherData);

        return {
            overallConditions,
            temperatureRange: { min: overallMin, max: overallMax },
            significantWeatherChanges,
            primaryConcerns
        };
    }

    /**
     * Get most frequent weather condition
     * @param {Array<string>} conditions - Array of weather conditions
     * @returns {string} Most frequent condition
     */
    getMostFrequentCondition(conditions) {
        const frequency = {};
        conditions.forEach(condition => {
            frequency[condition] = (frequency[condition] || 0) + 1;
        });

        return Object.keys(frequency).reduce((a, b) =>
            frequency[a] > frequency[b] ? a : b
        );
    }

    /**
     * Check for significant weather changes across days
     * @param {Array} weatherData - Daily weather forecasts
     * @returns {boolean} Whether there are significant changes
     */
    hasSignificantWeatherChanges(weatherData) {
        if (weatherData.length < 2) return false;

        for (let i = 1; i < weatherData.length; i++) {
            const prev = weatherData[i - 1];
            const curr = weatherData[i];

            // Check for temperature changes > 10°C
            const tempChange = Math.abs(curr.temperature.average - prev.temperature.average);
            if (tempChange > 10) return true;

            // Check for condition changes from sunny to rainy or vice versa
            if ((prev.conditions.main === 'sunny' && curr.conditions.main === 'rainy') ||
                (prev.conditions.main === 'rainy' && curr.conditions.main === 'sunny')) {
                return true;
            }
        }

        return false;
    }

    /**
     * Identify primary weather concerns
     * @param {Array} weatherData - Daily weather forecasts
     * @returns {Array<string>} Array of primary concerns
     */
    identifyPrimaryConcerns(weatherData) {
        const concerns = [];

        // Check for rain
        const rainyDays = weatherData.filter(day => day.conditions.main === 'rainy').length;
        if (rainyDays > 0) concerns.push('rain');

        // Check for cold weather
        const coldDays = weatherData.filter(day => day.temperature.min < 10).length;
        if (coldDays > 0) concerns.push('cold');

        // Check for hot weather
        const hotDays = weatherData.filter(day => day.temperature.max > 30).length;
        if (hotDays > 0) concerns.push('heat');

        // Check for windy conditions
        const windyDays = weatherData.filter(day => day.conditions.wind.speed > 10).length;
        if (windyDays > 0) concerns.push('wind');

        return concerns;
    }

    /**
     * Calculate weather data confidence score
     * @param {Array} weatherData - Daily weather forecasts
     * @returns {number} Confidence score between 0 and 1
     */
    calculateWeatherConfidence(weatherData) {
        if (!weatherData || weatherData.length === 0) return 0;

        // Base confidence on data completeness and recency
        let confidence = 0.8; // Base confidence for weather API data

        // Reduce confidence for far future dates
        const now = new Date();
        weatherData.forEach(day => {
            const dayDate = new Date(day.date);
            const daysAhead = Math.ceil((dayDate - now) / (1000 * 60 * 60 * 24));

            if (daysAhead > 7) {
                confidence -= 0.1; // Reduce confidence for dates > 7 days ahead
            }
        });

        return Math.max(confidence, 0.3); // Minimum confidence of 30%
    }

    /**
     * Add weather context to context accumulator
     * @param {string} sessionId - Session identifier
     * @param {Object} enrichedContext - Enriched context with weather data
     * @returns {Promise<void>}
     */
    async addWeatherContextToAccumulator(sessionId, enrichedContext) {
        try {
            // Prepare weather context for accumulator
            const weatherContextForAccumulator = {
                weatherData: enrichedContext.weatherContext,
                location: enrichedContext.weatherContext.location,
                seasonalFactors: this.extractSeasonalFactors(enrichedContext.weatherContext),
                temperatureRange: enrichedContext.weatherContext.summary?.temperatureRange,
                precipitationProbability: this.calculateAveragePrecipitation(enrichedContext.weatherContext.dailyForecasts),
                conditions: enrichedContext.weatherContext.summary?.overallConditions,
                layeringNeeds: this.determineLayeringNeeds(enrichedContext.weatherContext.dailyForecasts),
                weatherProtection: this.determineWeatherProtection(enrichedContext.weatherContext.dailyForecasts),
                comfortFactors: this.extractComfortFactors(enrichedContext.weatherContext.dailyForecasts)
            };

            // Add to context accumulator
            contextAccumulator.addWeatherContext(sessionId, weatherContextForAccumulator);

        } catch (error) {
            console.error('Failed to add weather context to accumulator:', error);
            throw error;
        }
    }

    /**
     * Extract seasonal factors from weather context
     * @param {Object} weatherContext - Weather context data
     * @returns {Object} Seasonal factors
     */
    extractSeasonalFactors(weatherContext) {
        const now = new Date();
        const month = now.getMonth();

        // Determine season
        let season;
        if (month >= 2 && month <= 4) season = 'spring';
        else if (month >= 5 && month <= 7) season = 'summer';
        else if (month >= 8 && month <= 10) season = 'autumn';
        else season = 'winter';

        return {
            season,
            month: month + 1,
            daylight: this.estimateDaylightHours(month),
            seasonalTrends: this.getSeasonalTrends(season)
        };
    }

    /**
     * Estimate daylight hours based on month
     * @param {number} month - Month (0-11)
     * @returns {number} Estimated daylight hours
     */
    estimateDaylightHours(month) {
        // Simplified daylight estimation for northern hemisphere
        const daylightMap = [9, 10, 12, 13, 15, 16, 15, 14, 12, 11, 9, 8];
        return daylightMap[month];
    }

    /**
     * Get seasonal trends
     * @param {string} season - Season name
     * @returns {Array<string>} Seasonal trends
     */
    getSeasonalTrends(season) {
        const trends = {
            spring: ['variable temperatures', 'rain showers', 'layering needed'],
            summer: ['hot temperatures', 'sun protection needed', 'light clothing'],
            autumn: ['cooling temperatures', 'layering important', 'rain possible'],
            winter: ['cold temperatures', 'heavy layering', 'weather protection']
        };

        return trends[season] || [];
    }

    /**
     * Calculate average precipitation probability
     * @param {Array} dailyForecasts - Daily weather forecasts
     * @returns {number} Average precipitation probability
     */
    calculateAveragePrecipitation(dailyForecasts) {
        if (!dailyForecasts || dailyForecasts.length === 0) return 0;

        const total = dailyForecasts.reduce((sum, day) =>
            sum + (day.conditions.precipitation?.probability || 0), 0
        );

        return Math.round(total / dailyForecasts.length);
    }

    /**
     * Determine layering needs across all days
     * @param {Array} dailyForecasts - Daily weather forecasts
     * @returns {string} Overall layering recommendation
     */
    determineLayeringNeeds(dailyForecasts) {
        if (!dailyForecasts || dailyForecasts.length === 0) return 'light';

        const layeringLevels = dailyForecasts.map(day => day.recommendations.layering);

        // Return the highest layering level needed
        if (layeringLevels.includes('heavy')) return 'heavy';
        if (layeringLevels.includes('moderate')) return 'moderate';
        if (layeringLevels.includes('light')) return 'light';
        return 'none';
    }

    /**
     * Determine weather protection needs
     * @param {Array} dailyForecasts - Daily weather forecasts
     * @returns {Array<string>} Weather protection recommendations
     */
    determineWeatherProtection(dailyForecasts) {
        if (!dailyForecasts || dailyForecasts.length === 0) return [];

        const protections = [];

        // Check if any day needs waterproof protection
        if (dailyForecasts.some(day => day.recommendations.waterproof)) {
            protections.push('waterproof');
        }

        // Check if any day needs sun protection
        if (dailyForecasts.some(day => day.recommendations.sunProtection)) {
            protections.push('sun protection');
        }

        // Check if any day needs warm accessories
        if (dailyForecasts.some(day => day.recommendations.warmAccessories)) {
            protections.push('warm accessories');
        }

        return protections;
    }

    /**
     * Extract comfort factors from daily forecasts
     * @param {Array} dailyForecasts - Daily weather forecasts
     * @returns {Array<string>} Comfort factors
     */
    extractComfortFactors(dailyForecasts) {
        if (!dailyForecasts || dailyForecasts.length === 0) return [];

        const factors = [];

        // Check for heat concerns
        if (dailyForecasts.some(day => day.comfort.comfortLevel === 'hot')) {
            factors.push('heat management');
        }

        // Check for cold concerns
        if (dailyForecasts.some(day => day.comfort.comfortLevel === 'cold')) {
            factors.push('warmth retention');
        }

        // Check for humidity concerns
        if (dailyForecasts.some(day => day.comfort.comfortLevel === 'humid')) {
            factors.push('moisture wicking');
        }

        // Check for wind concerns
        if (dailyForecasts.some(day => day.conditions.wind.speed > 15)) {
            factors.push('wind resistance');
        }

        return factors;
    }

    /**
     * Provide fallback weather context when API fails
     * @param {Object} eventDetails - Event details
     * @param {string} sessionId - Session identifier
     * @returns {Promise<Object>} Fallback weather context
     */
    async provideFallbackWeatherContext(eventDetails, sessionId) {
        console.warn('Using fallback weather context due to API failure');

        // Generate basic seasonal weather data
        const fallbackWeather = this.generateSeasonalFallback(eventDetails);

        // Add fallback context to accumulator
        await this.addWeatherContextToAccumulator(sessionId, fallbackWeather);

        return fallbackWeather;
    }

    /**
     * Generate seasonal fallback weather data
     * @param {Object} eventDetails - Event details
     * @returns {Object} Fallback weather context
     */
    generateSeasonalFallback(eventDetails) {
        const now = new Date();
        const month = now.getMonth();

        // Basic seasonal temperature ranges (Celsius)
        const seasonalData = {
            winter: { min: 0, max: 10, condition: 'cloudy' },
            spring: { min: 10, max: 20, condition: 'cloudy' },
            summer: { min: 20, max: 30, condition: 'sunny' },
            autumn: { min: 10, max: 20, condition: 'cloudy' }
        };

        let season;
        if (month >= 2 && month <= 4) season = 'spring';
        else if (month >= 5 && month <= 7) season = 'summer';
        else if (month >= 8 && month <= 10) season = 'autumn';
        else season = 'winter';

        const data = seasonalData[season];

        return {
            ...eventDetails,
            weatherContext: {
                location: {
                    name: eventDetails.location || 'Unknown',
                    coordinates: { lat: 0, lon: 0 },
                    resolvedFrom: eventDetails.location
                },
                dailyForecasts: [{
                    date: eventDetails.startDate || now.toISOString().split('T')[0],
                    temperature: {
                        min: data.min,
                        max: data.max,
                        average: Math.round((data.min + data.max) / 2),
                        feelsLike: Math.round((data.min + data.max) / 2),
                        unit: 'celsius'
                    },
                    conditions: {
                        main: data.condition,
                        description: `Seasonal ${data.condition} conditions`,
                        precipitation: { probability: 30, amount: null },
                        wind: { speed: 5, direction: 'Variable' },
                        humidity: 60,
                        uvIndex: null
                    },
                    comfort: {
                        heatIndex: null,
                        windChill: null,
                        comfortLevel: 'comfortable'
                    },
                    recommendations: {
                        layering: season === 'winter' ? 'heavy' : season === 'summer' ? 'none' : 'light',
                        waterproof: false,
                        sunProtection: season === 'summer',
                        warmAccessories: season === 'winter'
                    }
                }],
                summary: {
                    overallConditions: data.condition,
                    temperatureRange: { min: data.min, max: data.max },
                    significantWeatherChanges: false,
                    primaryConcerns: season === 'winter' ? ['cold'] : season === 'summer' ? ['heat'] : []
                }
            },
            contextGatheredAt: new Date().toISOString(),
            weatherDataSource: 'Seasonal Fallback',
            weatherDataConfidence: 0.3
        };
    }

    /**
     * Generate fallback weather data for a specific date
     * @param {string} date - Date string
     * @param {Object} location - Location information
     * @returns {Object} Fallback weather data
     */
    generateFallbackWeatherData(date, location) {
        const dateObj = new Date(date);
        const month = dateObj.getMonth();

        // Basic seasonal data
        let temp, condition;
        if (month >= 2 && month <= 4) { // Spring
            temp = { min: 10, max: 20 };
            condition = 'cloudy';
        } else if (month >= 5 && month <= 7) { // Summer
            temp = { min: 20, max: 30 };
            condition = 'sunny';
        } else if (month >= 8 && month <= 10) { // Autumn
            temp = { min: 10, max: 20 };
            condition = 'cloudy';
        } else { // Winter
            temp = { min: 0, max: 10 };
            condition = 'cloudy';
        }

        return {
            date: date,
            temperature: {
                min: temp.min,
                max: temp.max,
                average: Math.round((temp.min + temp.max) / 2),
                feelsLike: Math.round((temp.min + temp.max) / 2),
                unit: 'celsius'
            },
            conditions: {
                main: condition,
                description: `Seasonal ${condition} conditions`,
                precipitation: { probability: 30, amount: null },
                wind: { speed: 5, direction: 'Variable' },
                humidity: 60,
                uvIndex: null
            },
            comfort: {
                heatIndex: null,
                windChill: null,
                comfortLevel: 'comfortable'
            },
            recommendations: {
                layering: temp.max < 15 ? 'moderate' : temp.max > 25 ? 'none' : 'light',
                waterproof: false,
                sunProtection: condition === 'sunny',
                warmAccessories: temp.min < 10
            },
            fallback: true
        };
    }

    /**
     * Cache weather data
     * @param {string} key - Cache key
     * @param {Object} data - Weather data to cache
     */
    cacheWeatherData(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    /**
     * Get cached weather data
     * @param {string} key - Cache key
     * @returns {Object|null} Cached weather data or null if not found/expired
     */
    getCachedWeatherData(key) {
        const cached = this.cache.get(key);

        if (!cached) {
            return null;
        }

        // Check if cache is expired
        if (Date.now() - cached.timestamp > this.cacheTimeout) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    }

    /**
     * Clear expired cache entries
     */
    clearExpiredCache() {
        const now = Date.now();

        for (const [key, cached] of this.cache.entries()) {
            if (now - cached.timestamp > this.cacheTimeout) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Sleep utility for retry delays
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export singleton instance
const weatherContextService = new WeatherContextService();
export default weatherContextService;
export { WeatherContextService };