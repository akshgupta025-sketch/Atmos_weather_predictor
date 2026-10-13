document.addEventListener("DOMContentLoaded", () => {
  const cityInput = document.getElementById("city-input");
  const form = document.getElementById("weather-form");
  const getWeatherBtn = document.getElementById("get-weather-btn");
  const buttonLabel = getWeatherBtn.querySelector("span");
  const cityNameDisplay = document.getElementById("city-name");
  const localDateDisplay = document.getElementById("local-date");
  const temperatureDisplay = document.getElementById("temperature");
  const descriptionDisplay = document.getElementById("description");
  const feelsLikeDisplay = document.getElementById("feels-like");
  const windDisplay = document.getElementById("wind");
  const humidityDisplay = document.getElementById("humidity");
  const visibilityDisplay = document.getElementById("visibility");
  const errorMessage = document.getElementById("error-message");
  const statusMessage = document.getElementById("status-message");
  const weatherVisual = document.getElementById("weather-visual");
  const predictionModal = document.getElementById("prediction-modal");
  const predictionForm = document.getElementById("prediction-form");
  const predictionInput = document.getElementById("prediction-input");
  const predictionCity = document.getElementById("prediction-city");
  const predictionQuestion = document.getElementById("prediction-question");
  const predictionResult = document.getElementById("prediction-result");
  const predictionClose = document.getElementById("prediction-close");
  const predictionDone = document.getElementById("prediction-done");
  let pendingWeatherData = null;

  // Keep your OpenWeather key here for local practice. For a deployed app,
  // move API requests behind a server so the key isn't exposed publicly.
  const API_KEY = "5f56d525d1619d0a2cd2eac4ce55588e";
  document.getElementById("year").textContent = new Date().getFullYear();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    getWeather(cityInput.value);
  });

  document.querySelectorAll("[data-city]").forEach((button) => {
    button.addEventListener("click", () => {
      cityInput.value = button.dataset.city;
      getWeather(button.dataset.city);
    });
  });

  async function getWeather(city) {
    const cleanCity = city.trim();
    if (!cleanCity) {
      showError("Enter a city name to get its weather.");
      cityInput.focus();
      return;
    }

    setLoading(true);
    hideError();
    statusMessage.textContent = `Checking the skies over ${cleanCity}…`;

    try {
      const weatherData = await fetchWeatherData(cleanCity);
      pendingWeatherData = weatherData;
      openPrediction(weatherData.name);
      statusMessage.textContent = `Make your temperature prediction for ${weatherData.name}.`;
    } catch (error) {
      showError(error.message || "Something went wrong. Please try again.");
      statusMessage.textContent = "We couldn't update the forecast.";
    } finally {
      setLoading(false);
    }
  }

  predictionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!pendingWeatherData) return;
    const guess = Number(predictionInput.value);
    if (!Number.isFinite(guess) || predictionInput.value.trim() === "") {
      predictionInput.focus();
      return;
    }
    showPredictionResult(guess, pendingWeatherData);
  });

  predictionClose.addEventListener("click", () => {
    if (pendingWeatherData) displayWeatherData(pendingWeatherData);
    closePrediction();
  });

  predictionDone.addEventListener("click", closePrediction);

  predictionModal.addEventListener("click", (event) => {
    if (event.target === predictionModal) {
      if (pendingWeatherData) displayWeatherData(pendingWeatherData);
      closePrediction();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !predictionModal.classList.contains("hidden")) {
      if (pendingWeatherData) displayWeatherData(pendingWeatherData);
      closePrediction();
    }
  });

  function openPrediction(city) {
    predictionCity.textContent = city;
    predictionQuestion.classList.remove("hidden");
    predictionResult.classList.add("hidden");
    predictionInput.value = "";
    predictionModal.classList.remove("hidden");
    window.setTimeout(() => predictionInput.focus(), 50);
  }

  function showPredictionResult(guess, data) {
    const actual = Number(data.main.temp);
    const difference = Math.abs(guess - actual);
    // Closeness is 100% for an exact guess, decreasing linearly with the error.
    // The score is clamped to 0–100 so it remains intuitive.
    const score = actual === 0
      ? (difference === 0 ? 100 : 0)
      : Math.max(0, Math.min(100, (1 - difference / Math.abs(actual)) * 100));
    const roundedScore = Math.round(score);
    document.getElementById("closeness-score").textContent = `${roundedScore}%`;
    document.getElementById("your-guess").textContent = `${Number(guess.toFixed(1))}°C`;
    document.getElementById("actual-temp").textContent = `${Math.round(actual)}°C`;
    document.getElementById("temperature-difference").textContent =
      difference < 0.05 ? "Spot on! You nailed the temperature." : `You were ${difference.toFixed(1)}°C away from the actual temperature.`;
    document.getElementById("prediction-feedback").textContent =
      roundedScore >= 95 ? "Incredible — you've got weather instincts!" :
      roundedScore >= 80 ? "So close! That's a seriously good guess." :
      roundedScore >= 60 ? "Not bad! You're in the right ballpark." :
      roundedScore >= 35 ? "A little off — now you know the real feel." :
      "Surprise! The weather had other plans today.";
    document.getElementById("result-emoji").textContent =
      roundedScore >= 90 ? "🎯" : roundedScore >= 60 ? "😎" : "🌦️";
    displayWeatherData(data);
    predictionQuestion.classList.add("hidden");
    predictionResult.classList.remove("hidden");
  }

  function closePrediction() {
    predictionModal.classList.add("hidden");
  }

  async function fetchWeatherData(city) {
    const url = new URL("https://api.openweathermap.org/data/2.5/weather");
    url.search = new URLSearchParams({
      q: city,
      units: "metric",
      appid: API_KEY
    }).toString();

    const response = await fetch(url);
    if (response.status === 404) throw new Error("We couldn't find that city. Check the spelling and try again.");
    if (response.status === 401) throw new Error("Weather API key was rejected. Check your OpenWeather API key.");
    if (!response.ok) throw new Error("Weather data is unavailable right now. Please try again shortly.");
    return response.json();
  }

  function displayWeatherData(data) {
    const current = data.weather?.[0] || {};
    cityNameDisplay.textContent = `${data.name}${data.sys?.country ? `, ${data.sys.country}` : ""}`;
    localDateDisplay.textContent = new Intl.DateTimeFormat(undefined, {
      weekday: "long", month: "short", day: "numeric"
    }).format(new Date());
    temperatureDisplay.textContent = Math.round(data.main.temp);
    descriptionDisplay.textContent = current.description
      ? current.description.charAt(0).toUpperCase() + current.description.slice(1)
      : "Conditions unavailable";
    feelsLikeDisplay.textContent = `Feels like ${Math.round(data.main.feels_like)}°C`;
    windDisplay.innerHTML = `${Math.round(data.wind?.speed ?? 0)} <span>m/s</span>`;
    humidityDisplay.innerHTML = `${data.main.humidity} <span>%</span>`;
    visibilityDisplay.innerHTML = `${((data.visibility ?? 0) / 1000).toFixed(1)} <span>km</span>`;
    weatherVisual.innerHTML = getWeatherIcon(current.main, current.icon);
    hideError();
  }

  function getWeatherIcon(condition = "", iconCode = "") {
    const night = iconCode.endsWith("n");
    if (condition.toLowerCase().includes("thunder")) {
      return `<svg viewBox="0 0 120 120" class="h-28 w-28 sm:h-36 sm:w-36" fill="none" aria-hidden="true"><path d="M27 73a19 19 0 0 1 4-37 29 29 0 0 1 54 9 17 17 0 0 1 3 33H27Z" fill="#a5b4fc"/><path d="m63 70-13 21h13l-4 17 20-27H66l8-11" fill="#fcd34d" stroke="#fcd34d" stroke-linejoin="round"/></svg>`;
    }
    if (condition.toLowerCase().includes("rain") || condition.toLowerCase().includes("drizzle")) {
      return `<svg viewBox="0 0 120 120" class="h-28 w-28 sm:h-36 sm:w-36" fill="none" aria-hidden="true"><path d="M27 66a19 19 0 0 1 4-37 29 29 0 0 1 54 9 17 17 0 0 1 3 33H27Z" fill="#c4b5fd"/><g stroke="#67e8f9" stroke-width="4" stroke-linecap="round"><path d="m39 79-5 12m25-12-5 12m25-12-5 12"/></g></svg>`;
    }
    if (condition.toLowerCase().includes("snow")) {
      return `<svg viewBox="0 0 120 120" class="h-28 w-28 sm:h-36 sm:w-36" fill="none" aria-hidden="true"><path d="M27 66a19 19 0 0 1 4-37 29 29 0 0 1 54 9 17 17 0 0 1 3 33H27Z" fill="#c4b5fd"/><g fill="#a5f3fc" font-size="22"><text x="29" y="99">✳</text><text x="60" y="108">✳</text><text x="83" y="95">✳</text></g></svg>`;
    }
    if (condition.toLowerCase().includes("cloud") || condition.toLowerCase().includes("mist") || condition.toLowerCase().includes("fog") || condition.toLowerCase().includes("haze")) {
      return `<svg viewBox="0 0 120 120" class="h-28 w-28 sm:h-36 sm:w-36" fill="none" aria-hidden="true"><circle cx="67" cy="39" r="21" fill="#fcd34d" opacity=".7"/><path d="M27 77a19 19 0 0 1 4-37 29 29 0 0 1 54 9 17 17 0 0 1 3 33H27Z" fill="#c4b5fd"/><path d="M32 88h55" stroke="#a5f3fc" stroke-width="4" stroke-linecap="round" opacity=".8"/></svg>`;
    }
    if (night) {
      return `<svg viewBox="0 0 120 120" class="h-28 w-28 sm:h-36 sm:w-36" fill="none" aria-hidden="true"><path d="M79 18a37 37 0 0 0 25 49A39 39 0 0 1 46 29a38 38 0 0 1 33-11Z" fill="#c4b5fd"/><g fill="#a5f3fc"><circle cx="33" cy="35" r="2.5"/><circle cx="89" cy="84" r="2"/><circle cx="42" cy="72" r="2"/></g></svg>`;
    }
    return `<svg viewBox="0 0 120 120" class="h-28 w-28 sm:h-36 sm:w-36" aria-hidden="true"><defs><linearGradient id="sunGradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fde68a"/><stop offset="1" stop-color="#fb923c"/></linearGradient></defs><circle cx="60" cy="57" r="25" fill="url(#sunGradient)"/><g stroke="#fbbf24" stroke-width="3" stroke-linecap="round"><path d="M60 15v8M60 91v8M18 57h8M94 57h8M30 27l6 6M84 81l6 6M90 27l-6 6M36 81l-6 6"/></g></svg>`;
  }

  function setLoading(isLoading) {
    getWeatherBtn.disabled = isLoading;
    buttonLabel.textContent = isLoading ? "Loading…" : "Explore";
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove("hidden");
  }

  function hideError() {
    errorMessage.classList.add("hidden");
    errorMessage.textContent = "";
  }
});
