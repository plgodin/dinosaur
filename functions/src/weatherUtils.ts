import * as logger from "firebase-functions/logger";

interface WeatherData {
  temperature: number;
  condition: string;
  description: string;
  humidity: number;
  windSpeed: number;
}

interface WeatherContext {
  contextText: string;
  isNotable: boolean;
}

/**
 * Fetches weather data from OpenWeatherMap API
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {string} apiKey - OpenWeatherMap API key
 * @return {Promise<WeatherData | null>} Weather data or null if failed
 */
async function fetchWeatherData(lat: number, lon: number, apiKey: string): Promise<WeatherData | null> {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=fr`;
    const response = await fetch(url);

    if (!response.ok) {
      logger.warn(`Weather API request failed: ${response.status}`);
      return null;
    }

    const data = await response.json();

    return {
      temperature: Math.round(data.main.temp),
      condition: data.weather[0].main.toLowerCase(),
      description: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: Math.round(data.wind?.speed * 3.6), // Convert m/s to km/h
    };
  } catch (error) {
    logger.error("Error fetching weather data:", error);
    return null;
  }
}

/**
 * Gets weather data for Montreal (default location)
 * @param {string} apiKey - OpenWeatherMap API key
 * @return {Promise<WeatherData | null>} Weather data or null if failed
 */
async function getMontrealWeather(apiKey: string): Promise<WeatherData | null> {
  // Montreal coordinates
  return fetchWeatherData(45.5017, -73.5673, apiKey);
}

/**
 * Determines if weather conditions are notable enough to influence AI generation
 * @param {WeatherData} weather - Weather data
 * @return {boolean} True if weather is notable
 */
function isNotableWeather(weather: WeatherData): boolean {
  // Temperature extremes
  if (weather.temperature <= -15 || weather.temperature >= 30) {
    return true;
  }

  // Notable weather conditions
  const notableConditions = [
    "thunderstorm", "drizzle", "rain", "snow",
    "mist", "fog", "dust", "sand", "ash", "squall", "tornado",
  ];

  if (notableConditions.includes(weather.condition)) {
    return true;
  }

  // High wind speeds (>30 km/h)
  if (weather.windSpeed > 30) {
    return true;
  }

  return false;
}

/**
 * Creates weather context text for AI prompt
 * @param {WeatherData} weather - Weather data
 * @return {WeatherContext} Weather context for AI
 */
function createWeatherContext(weather: WeatherData): WeatherContext {
  const isNotable = isNotableWeather(weather);

  if (!isNotable) {
    // For normal weather, provide minimal context
    return {
      contextText: `Il fait ${weather.temperature}°C dehors.`,
      isNotable: false,
    };
  }

  // For notable weather, provide more detailed context
  let contextText = `Il fait ${weather.temperature}°C dehors`;

  // Add weather condition details for notable weather
  if (weather.condition === "rain") {
    contextText += " et il pleut";
  } else if (weather.condition === "snow") {
    contextText += " et il neige";
  } else if (weather.condition === "thunderstorm") {
    contextText += " et il y a un orage";
  } else if (weather.condition === "fog" || weather.condition === "mist") {
    contextText += " et il y a du brouillard";
  } else if (weather.windSpeed > 30) {
    contextText += " et il y a beaucoup de vent";
  }

  // Add temperature descriptors for extremes
  if (weather.temperature <= -15) {
    contextText += " (très froid)";
  } else if (weather.temperature >= 30) {
    contextText += " (très chaud)";
  }

  contextText += ".";

  return {
    contextText,
    isNotable: true,
  };
}

/**
 * Gets weather context for activity generation
 * @param {number | undefined} lat - User latitude (optional)
 * @param {number | undefined} lon - User longitude (optional)
 * @param {string} apiKey - OpenWeatherMap API key
 * @return {Promise<WeatherContext | null>} Weather context or null if failed
 */
export async function getWeatherContext(
  lat: number | undefined,
  lon: number | undefined,
  apiKey: string,
): Promise<WeatherContext | null> {
  let weatherData: WeatherData | null = null;

  // Try to get weather for user location first
  if (lat !== undefined && lon !== undefined) {
    weatherData = await fetchWeatherData(lat, lon, apiKey);
  }

  // Fall back to Montreal if user location failed or wasn't provided
  if (!weatherData) {
    weatherData = await getMontrealWeather(apiKey);
  }

  if (!weatherData) {
    logger.warn("Failed to fetch weather data from all sources");
    return null;
  }

  return createWeatherContext(weatherData);
}
