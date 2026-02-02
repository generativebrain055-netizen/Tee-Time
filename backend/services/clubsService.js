/**
 * Golf Clubs Service
 * Loads clubs from CSV and provides fast in-memory search
 */

const fs = require("fs");
const path = require("path");
const logger = require("../config/logger");

class ClubsService {
  constructor() {
    this.clubs = [];
    this.clubsByCity = new Map();
    this.clubsByState = new Map();
    this.cities = [];
    this.loaded = false;
  }

  /**
   * Load clubs from CSV file on startup
   */
  async loadClubs() {
    if (this.loaded) return;

    try {
      const csvPath = path.resolve(__dirname, "../data/clubs.csv");

      if (!fs.existsSync(csvPath)) {
        logger.warn("Clubs CSV file not found at:", csvPath);
        return;
      }

      const content = fs.readFileSync(csvPath, "utf-8");
      const lines = content.split("\n");

      // Parse header
      const header = lines[0].split(",");
      const columnIndex = {
        ClubID: header.indexOf("ClubID"),
        ClubName: header.indexOf("ClubName"),
        Address: header.indexOf("Address"),
        City: header.indexOf("City"),
        PostalCode: header.indexOf("PostalCode"),
        State: header.indexOf("State"),
        Country: header.indexOf("Country"),
        Latitude: header.indexOf("Latitude"),
        Longitude: header.indexOf("Longitude"),
        Website: header.indexOf("Website"),
        Telephone: header.indexOf("Telephone"),
      };

      // Parse data rows
      const citySet = new Set();

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Handle CSV with quoted fields
        const values = this.parseCSVLine(line);
        if (values.length < 7) continue;

        const club = {
          id: values[columnIndex.ClubID] || `club-${i}`,
          name: values[columnIndex.ClubName]?.trim() || "",
          address: values[columnIndex.Address]?.trim() || "",
          city: values[columnIndex.City]?.trim() || "",
          postalCode: values[columnIndex.PostalCode]?.trim() || "",
          state: values[columnIndex.State]?.trim() || "",
          country: values[columnIndex.Country]?.trim() || "USA",
          latitude: parseFloat(values[columnIndex.Latitude]) || null,
          longitude: parseFloat(values[columnIndex.Longitude]) || null,
          website: values[columnIndex.Website]?.trim() || null,
          telephone: values[columnIndex.Telephone]?.trim() || null,
        };

        // Skip invalid entries
        if (!club.name || club.name.length < 2) continue;

        this.clubs.push(club);

        // Index by city
        const cityKey = `${club.city}, ${club.state}`.toLowerCase();
        if (!this.clubsByCity.has(cityKey)) {
          this.clubsByCity.set(cityKey, []);
        }
        this.clubsByCity.get(cityKey).push(club);

        // Index by state
        const stateKey = club.state.toLowerCase();
        if (!this.clubsByState.has(stateKey)) {
          this.clubsByState.set(stateKey, []);
        }
        this.clubsByState.get(stateKey).push(club);

        // Collect unique cities
        if (club.city && club.state) {
          citySet.add(`${club.city}, ${club.state}`);
        }
      }

      // Sort cities alphabetically
      this.cities = Array.from(citySet).sort();

      this.loaded = true;
      logger.info(`Loaded ${this.clubs.length} golf clubs from CSV`);
      logger.info(`Indexed ${this.cities.length} unique cities`);
    } catch (error) {
      logger.error("Error loading clubs CSV:", error);
    }
  }

  /**
   * Parse a CSV line handling quoted fields
   */
  parseCSVLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());

    return result;
  }

  /**
   * Search clubs by name or city
   * @param {string} query - Search query
   * @param {number} limit - Max results
   * @returns {Array} Matching clubs
   */
  searchClubs(query, limit = 20) {
    if (!this.loaded || !query || query.length < 2) {
      return [];
    }

    const searchTerm = query.toLowerCase();
    const results = [];
    const seen = new Set();

    // Search by name first (more relevant)
    for (const club of this.clubs) {
      if (results.length >= limit) break;

      const nameMatch = club.name.toLowerCase().includes(searchTerm);
      const cityMatch = club.city?.toLowerCase().includes(searchTerm);
      const stateMatch = club.state?.toLowerCase().includes(searchTerm);

      if (nameMatch || cityMatch || stateMatch) {
        if (!seen.has(club.id)) {
          seen.add(club.id);
          results.push({
            id: club.id,
            name: club.name,
            location:
              club.city && club.state
                ? `${club.city}, ${club.state}`
                : club.city || club.state || "USA",
            address: club.address,
            city: club.city,
            state: club.state,
            latitude: club.latitude,
            longitude: club.longitude,
            website: club.website,
            telephone: club.telephone,
            // Prioritize name matches
            _score: nameMatch ? 2 : 1,
          });
        }
      }
    }

    // Sort by relevance score, then alphabetically
    return results
      .sort((a, b) => b._score - a._score || a.name.localeCompare(b.name))
      .map(({ _score, ...club }) => club);
  }

  /**
   * Get clubs in a specific city
   * @param {string} city - City name
   * @param {string} state - State code
   * @returns {Array} Clubs in the city
   */
  getClubsByCity(city, state) {
    if (!this.loaded) return [];

    const cityKey = `${city}, ${state}`.toLowerCase();
    return this.clubsByCity.get(cityKey) || [];
  }

  /**
   * Get clubs in a specific state
   * @param {string} state - State code
   * @param {number} limit - Max results
   * @returns {Array} Clubs in the state
   */
  getClubsByState(state, limit = 50) {
    if (!this.loaded) return [];

    const stateKey = state.toLowerCase();
    const clubs = this.clubsByState.get(stateKey) || [];
    return clubs.slice(0, limit);
  }

  /**
   * Search cities
   * @param {string} query - Search query
   * @param {number} limit - Max results
   * @returns {Array} Matching cities
   */
  searchCities(query, limit = 20) {
    if (!this.loaded || !query || query.length < 2) {
      return [];
    }

    const searchTerm = query.toLowerCase();
    return this.cities
      .filter((city) => city.toLowerCase().includes(searchTerm))
      .slice(0, limit)
      .map((city) => {
        const [cityName, state] = city.split(", ");
        return {
          id: city.replace(/\s+/g, "-").toLowerCase(),
          name: city,
          city: cityName,
          state: state,
        };
      });
  }

  /**
   * Get popular cities (cities with most clubs)
   * @param {number} limit - Max results
   * @returns {Array} Popular cities
   */
  getPopularCities(limit = 20) {
    if (!this.loaded) return [];

    const cityCounts = [];
    for (const [key, clubs] of this.clubsByCity.entries()) {
      const [city, state] = key.split(", ");
      cityCounts.push({
        id: key.replace(/\s+/g, "-"),
        name: `${city}, ${state}`.replace(/^\w/, (c) => c.toUpperCase()),
        city: city,
        state: state?.toUpperCase(),
        clubCount: clubs.length,
      });
    }

    return cityCounts.sort((a, b) => b.clubCount - a.clubCount).slice(0, limit);
  }

  /**
   * Get club by ID
   * @param {string} id - Club ID
   * @returns {Object|null} Club or null
   */
  getClubById(id) {
    if (!this.loaded) return null;
    return this.clubs.find((club) => club.id === id) || null;
  }

  /**
   * Get total counts
   */
  getStats() {
    return {
      totalClubs: this.clubs.length,
      totalCities: this.cities.length,
      totalStates: this.clubsByState.size,
      loaded: this.loaded,
    };
  }
}

// Singleton instance
const clubsService = new ClubsService();

module.exports = clubsService;
