const { downdetector } = require("downdetector-api");
const NodeCache = require("node-cache");

class DowndetectorService {
  constructor(ttlSeconds = 600) {
    // Cache of 10 minutes to prevent IP blocking (Rate Limiting) and improve performance
    this.cache = new NodeCache({ stdTTL: ttlSeconds });
  }

  /**
   * Gets the service status with Cache-First strategy
   */
  async getStatus(serviceId) {
    // Use a 'br' prefix to ensure the cache doesn't mix data if we change the region in the future
    const cacheKey = `status_br_${serviceId}`;
    const cachedData = this.cache.get(cacheKey);

    if (cachedData) {
      return { ...cachedData, cached: true };
    }

    return this.fetchFromSource(serviceId, cacheKey);
  }

  /**
   * Private method to fetch from source and hydrate cache
   */
  async fetchFromSource(serviceId, cacheKey) {
    try {
      // Attempt to fetch data from the library using the Brazilian domain
      // The second parameter 'com.br' instructs the lib to use downdetector.com.br
      // Note: In cloud environments (AWS, Google Cloud, Render, etc.), Downdetector
      // frequently blocks the IP, returning empty data (zeros).
      const response = await downdetector(serviceId, "com.br");

      // 1. Basic Structural Validation
      // If response is null or doesn't have expected arrays, something failed in the lib
      if (
        !response ||
        !Array.isArray(response.reports) ||
        !Array.isArray(response.baseline)
      ) {
        console.warn(
          `[Downdetector] Invalid response for '${serviceId}' (BR).`
        );
        return this.createFallbackState(serviceId);
      }

      // 2. Data Extraction
      // Get the last data point (real-time)
      const currentReport = response.reports[response.reports.length - 1] || {
        value: 0,
      };
      const currentBaseline = response.baseline[
        response.baseline.length - 1
      ] || { value: 0 };

      const reportsValue = currentReport.value;
      const baselineValue = currentBaseline.value;

      // 3. "Blindness" Validation (Zero Data)
      // If both are 0, the scraper was blocked by Cloudflare.
      // Return fallback to avoid falsely showing "0 issues".
      if (reportsValue === 0 && baselineValue === 0) {
        console.warn(
          `[Downdetector] Cloudflare block detected for '${serviceId}'.`
        );
        return this.createFallbackState(serviceId);
      }

      // 4. Business Logic (Adjusted Sensitivity)
      const MIN_REPORTS_THRESHOLD = 50;
      const SPIKE_FACTOR = 1.5; // 50% above average

      const isHighVolume = reportsValue > MIN_REPORTS_THRESHOLD;
      const isSignificantSpike = reportsValue > baselineValue * SPIKE_FACTOR;

      const hasIssues = isHighVolume && isSignificantSpike;

      const result = {
        service: serviceId,
        hasIssues: hasIssues,
        reports: reportsValue,
        baseline: baselineValue,
        cached: false,
        lastUpdate: new Date().toISOString(),
        status: "success", // Indicates successful read with real data
        region: "BR",
      };

      // Save to cache only if it's a real success
      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error(
        `[Downdetector] Error processing '${serviceId}':`,
        error.message
      );
      // In case of error (timeout, parse error), return safe fallback
      return this.createFallbackState(serviceId, true);
    }
  }

  // Helper to create a safe state when something fails or is blocked
  createFallbackState(serviceId, isError = false) {
    return {
      service: serviceId,
      hasIssues: false, // Assume false to avoid panic in case of doubt
      reports: 0,
      baseline: 0,
      cached: false,
      lastUpdate: new Date().toISOString(),
      status: "unknown", // Important flag: frontend should handle this (e.g., hide chart)
      message: "Monitoramento indisponível temporariamente (Fonte externa)",
      region: "BR",
    };
  }
}

module.exports = new DowndetectorService();
