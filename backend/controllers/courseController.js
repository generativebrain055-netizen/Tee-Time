const courseRepository = require("../repositories/courseRepository");
const logger = require("../config/logger");

// Google Places API integration (uses GOOGLE_MAPS_API_KEY or GOOGLE_PLACES_API_KEY)
const GOOGLE_PLACES_API_KEY =
  process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

class CourseController {
  constructor() {
    // Bind methods to preserve 'this' context
    this.searchCourses = this.searchCourses.bind(this);
    this.getCourse = this.getCourse.bind(this);
    this.getNearbyCourses = this.getNearbyCourses.bind(this);
    this.getPopularCourses = this.getPopularCourses.bind(this);
    this.addFavorite = this.addFavorite.bind(this);
    this.removeFavorite = this.removeFavorite.bind(this);
    this.getFavorites = this.getFavorites.bind(this);
    this.searchClubs = this.searchClubs.bind(this);
    this.searchCities = this.searchCities.bind(this);
    this.getPopularCities = this.getPopularCities.bind(this);
    this.getClubStats = this.getClubStats.bind(this);
  }

  // GET /api/courses/clubs/search - Search golf clubs from database
  async searchClubs(req, res) {
    try {
      const { q, limit = 20 } = req.query;

      if (!q || q.length < 2) {
        return res.json({
          success: true,
          clubs: [],
          message: "Query too short",
        });
      }

      const clubs = await courseRepository.searchClubs(q, parseInt(limit));
      res.json({ success: true, clubs, source: "database" });
    } catch (error) {
      logger.error("Search clubs error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to search clubs" });
    }
  }

  // GET /api/courses/cities/search - Search cities with golf clubs (database)
  async searchCities(req, res) {
    try {
      const { q, limit = 20 } = req.query;

      if (!q || q.length < 2) {
        return res.json({
          success: true,
          cities: [],
          message: "Query too short",
        });
      }

      const cities = await courseRepository.searchCities(q, parseInt(limit));
      res.json({ success: true, cities });
    } catch (error) {
      logger.error("Search cities error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to search cities" });
    }
  }

  // GET /api/courses/cities/popular - Get cities with most golf clubs (database)
  async getPopularCities(req, res) {
    try {
      const { limit = 20 } = req.query;
      const cities = await courseRepository.getPopularCities(parseInt(limit));
      res.json({ success: true, cities });
    } catch (error) {
      logger.error("Get popular cities error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to get popular cities" });
    }
  }

  // GET /api/courses/clubs/stats - Get club/course statistics (database)
  async getClubStats(req, res) {
    try {
      const stats = await courseRepository.getCourseStats();
      res.json({ success: true, stats });
    } catch (error) {
      logger.error("Get club stats error:", error);
      res.status(500).json({ success: false, message: "Failed to get stats" });
    }
  }

  // GET /api/courses/search
  async searchCourses(req, res) {
    try {
      const { q, lat, lng } = req.query;

      // If we have coordinates, search Google Places first
      if (GOOGLE_PLACES_API_KEY && ((lat && lng) || q)) {
        const googleResults = await this.searchGooglePlaces(q, lat, lng);
        if (googleResults.length > 0) {
          return res.json({
            success: true,
            courses: googleResults,
            source: "google",
          });
        }
      }

      // Fallback to local database
      if (q) {
        const courses = await courseRepository.searchCourses(q);
        return res.json({ success: true, courses, source: "local" });
      }

      res.json({ success: true, courses: [], source: "none" });
    } catch (error) {
      logger.error("Search courses error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to search courses" });
    }
  }

  // Search Google Places API for golf courses
  async searchGooglePlaces(query, lat, lng) {
    if (!GOOGLE_PLACES_API_KEY) return [];

    try {
      const baseUrl =
        "https://maps.googleapis.com/maps/api/place/textsearch/json";
      const searchQuery = query ? `${query} golf course` : "golf course";

      let url = `${baseUrl}?query=${encodeURIComponent(searchQuery)}&type=establishment&key=${GOOGLE_PLACES_API_KEY}`;

      if (lat && lng) {
        url += `&location=${lat},${lng}&radius=50000`; // 50km radius
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== "OK" || !data.results) {
        return [];
      }

      return data.results.slice(0, 10).map((place) => ({
        id: place.place_id,
        googlePlaceId: place.place_id,
        name: place.name,
        address: place.formatted_address,
        latitude: place.geometry?.location?.lat,
        longitude: place.geometry?.location?.lng,
        rating: place.rating,
        priceLevel: place.price_level,
        isOpen: place.opening_hours?.open_now,
        photo: place.photos?.[0]?.photo_reference
          ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${GOOGLE_PLACES_API_KEY}`
          : null,
      }));
    } catch (error) {
      logger.error("Google Places API error:", error);
      return [];
    }
  }

  // GET /api/courses/:id
  async getCourse(req, res) {
    try {
      const courseId = req.params.id;

      // Check if it's a Google Place ID
      if (courseId.startsWith("ChI")) {
        const details = await this.getGooglePlaceDetails(courseId);
        if (details) {
          return res.json({ success: true, course: details, source: "google" });
        }
      }

      // Try local database
      const course = await courseRepository.getCourseById(courseId);
      if (course) {
        return res.json({ success: true, course, source: "local" });
      }

      res.status(404).json({ success: false, message: "Course not found" });
    } catch (error) {
      logger.error("Get course error:", error);
      res.status(500).json({ success: false, message: "Failed to get course" });
    }
  }

  // Get Google Place details
  async getGooglePlaceDetails(placeId) {
    if (!GOOGLE_PLACES_API_KEY) return null;

    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,website,geometry,rating,price_level,opening_hours,photos,address_components&key=${GOOGLE_PLACES_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== "OK" || !data.result) {
        return null;
      }

      const place = data.result;
      const addressComponents = place.address_components || [];

      const getComponent = (type) => {
        const comp = addressComponents.find((c) => c.types.includes(type));
        return comp?.long_name || null;
      };

      return {
        id: placeId,
        googlePlaceId: placeId,
        name: place.name,
        address: place.formatted_address,
        city:
          getComponent("locality") ||
          getComponent("administrative_area_level_2"),
        state: getComponent("administrative_area_level_1"),
        country: getComponent("country"),
        postalCode: getComponent("postal_code"),
        latitude: place.geometry?.location?.lat,
        longitude: place.geometry?.location?.lng,
        phone: place.formatted_phone_number,
        website: place.website,
        rating: place.rating,
        priceLevel: place.price_level,
        hours: place.opening_hours?.weekday_text,
        photos: place.photos
          ?.slice(0, 5)
          .map(
            (p) =>
              `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${p.photo_reference}&key=${GOOGLE_PLACES_API_KEY}`,
          ),
      };
    } catch (error) {
      logger.error("Google Place details error:", error);
      return null;
    }
  }

  // GET /api/courses/nearby
  async getNearbyCourses(req, res) {
    try {
      const { lat, lng, radius = 25 } = req.query;

      if (!lat || !lng) {
        return res
          .status(400)
          .json({ success: false, message: "Latitude and longitude required" });
      }

      // Try Google Places first
      if (GOOGLE_PLACES_API_KEY) {
        const googleResults = await this.searchGooglePlaces(null, lat, lng);
        if (googleResults.length > 0) {
          return res.json({
            success: true,
            courses: googleResults,
            source: "google",
          });
        }
      }

      // Fallback to local database
      const courses = await courseRepository.getNearbyCourses(
        parseFloat(lat),
        parseFloat(lng),
        parseFloat(radius),
      );
      res.json({ success: true, courses, source: "local" });
    } catch (error) {
      logger.error("Get nearby courses error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to get nearby courses" });
    }
  }

  // GET /api/courses/popular
  async getPopularCourses(req, res) {
    try {
      const { limit = 10 } = req.query;
      const courses = await courseRepository.getPopularCourses(parseInt(limit));
      res.json({ success: true, courses });
    } catch (error) {
      logger.error("Get popular courses error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to get popular courses" });
    }
  }

  // POST /api/courses/favorites
  async addFavorite(req, res) {
    try {
      const userId = req.user.id;
      const { courseId, courseData } = req.body;

      // If it's a Google Place, save to local DB first
      if (courseData?.googlePlaceId) {
        await courseRepository.upsertCourse(courseData);
      }

      const favorite = await courseRepository.addFavorite(userId, courseId);
      res.json({ success: true, favorite });
    } catch (error) {
      logger.error("Add favorite error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to add favorite" });
    }
  }

  // DELETE /api/courses/favorites/:id
  async removeFavorite(req, res) {
    try {
      const userId = req.user.id;
      const courseId = req.params.id;

      await courseRepository.removeFavorite(userId, courseId);
      res.json({ success: true, message: "Removed from favorites" });
    } catch (error) {
      logger.error("Remove favorite error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to remove favorite" });
    }
  }

  // GET /api/courses/favorites
  async getFavorites(req, res) {
    try {
      const userId = req.user.id;
      const favorites = await courseRepository.getUserFavorites(userId);
      res.json({ success: true, courses: favorites });
    } catch (error) {
      logger.error("Get favorites error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to get favorites" });
    }
  }
}

module.exports = new CourseController();
