const { supabaseAdmin, handleError } = require("../config/supabase");

/**
 * Course Repository - Supabase REST API
 * Handles all database operations related to golf courses
 */

class CourseRepository {
    // Search courses by name/location
    async searchCourses(query, limit = 10) {
        try {
            const searchPattern = `%${query}%`;
            const { data, error } = await supabaseAdmin
                .from("golf_courses")
                .select("id, name, address, city, state, country, postal_code, latitude, longitude, phone, website, holes, par, course_type, price_range, rating, google_place_id")
                .or(`name.ilike.${searchPattern},city.ilike.${searchPattern},address.ilike.${searchPattern}`)
                .order("rating", { ascending: false, nullsFirst: false })
                .order("name", { ascending: true })
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (error) {
            handleError(error, "searchCourses");
        }
    }

    // Get course by ID
    async getCourseById(courseId) {
        try {
            const { data, error } = await supabaseAdmin
                .from("golf_courses")
                .select("*")
                .eq("id", courseId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data || null;
        } catch (error) {
            handleError(error, "getCourseById");
        }
    }

    // Get course by Google Place ID
    async getCourseByPlaceId(placeId) {
        try {
            const { data, error } = await supabaseAdmin
                .from("golf_courses")
                .select("*")
                .eq("google_place_id", placeId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data || null;
        } catch (error) {
            handleError(error, "getCourseByPlaceId");
        }
    }

    // Create or update course from Google Places
    async upsertCourse(courseData) {
        const {
            name, address, city, state, country, postalCode,
            latitude, longitude, phone, website, googlePlaceId,
            rating, priceRange
        } = courseData;

        try {
            const { data, error } = await supabaseAdmin
                .from("golf_courses")
                .upsert({
                    name,
                    address,
                    city,
                    state,
                    country: country || 'USA',
                    postal_code: postalCode,
                    latitude,
                    longitude,
                    phone,
                    website,
                    google_place_id: googlePlaceId,
                    rating,
                    price_range: priceRange,
                }, {
                    onConflict: 'google_place_id',
                    ignoreDuplicates: false,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            handleError(error, "upsertCourse");
        }
    }

    // Get nearby courses
    // Note: Haversine formula calculation needs to be done via PostgreSQL function
    async getNearbyCourses(latitude, longitude, radiusMiles = 25, limit = 20) {
        try {
            // Call PostgreSQL function for Haversine calculation
            const { data, error } = await supabaseAdmin
                .rpc('get_nearby_courses', {
                    p_latitude: latitude,
                    p_longitude: longitude,
                    p_radius_miles: radiusMiles,
                    p_limit: limit
                });

            if (error) throw error;
            return data || [];
        } catch (error) {
            // Fallback: Get all courses and filter client-side (not recommended for production)
            const logger = require("../config/logger");
            logger.warn("get_nearby_courses function not found. Implement PostgreSQL function for better performance.");
            logger.warn("CREATE FUNCTION get_nearby_courses(p_latitude FLOAT, p_longitude FLOAT, p_radius_miles FLOAT, p_limit INT)");
            
            try {
                const { data, error: fallbackError } = await supabaseAdmin
                    .from("golf_courses")
                    .select("*")
                    .not("latitude", "is", null)
                    .not("longitude", "is", null)
                    .limit(100);

                if (fallbackError) throw fallbackError;

                // Calculate distance client-side
                const coursesWithDistance = (data || []).map(course => {
                    const R = 3959; // Earth radius in miles
                    const dLat = (course.latitude - latitude) * Math.PI / 180;
                    const dLon = (course.longitude - longitude) * Math.PI / 180;
                    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                             Math.cos(latitude * Math.PI / 180) * Math.cos(course.latitude * Math.PI / 180) *
                             Math.sin(dLon/2) * Math.sin(dLon/2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                    const distance_miles = R * c;
                    
                    return { ...course, distance_miles };
                });

                return coursesWithDistance
                    .filter(c => c.distance_miles < radiusMiles)
                    .sort((a, b) => a.distance_miles - b.distance_miles)
                    .slice(0, limit);
            } catch (fallbackError) {
                handleError(fallbackError, "getNearbyCourses fallback");
            }
        }
    }

    // Get popular courses
    async getPopularCourses(limit = 10) {
        try {
            // This requires aggregation - best done via PostgreSQL function
            const { data, error } = await supabaseAdmin
                .rpc('get_popular_courses', { p_limit: limit });

            if (error) throw error;
            return data || [];
        } catch (error) {
            // Fallback: Just return courses by rating
            const logger = require("../config/logger");
            logger.warn("get_popular_courses function not found. Returning by rating instead.");
            
            try {
                const { data, error: fallbackError } = await supabaseAdmin
                    .from("golf_courses")
                    .select("*")
                    .order("rating", { ascending: false, nullsFirst: false })
                    .limit(limit);

                if (fallbackError) throw fallbackError;
                return data || [];
            } catch (fallbackError) {
                handleError(fallbackError, "getPopularCourses fallback");
            }
        }
    }

    // Add to user favorites
    async addFavorite(userId, courseId) {
        try {
            const { data, error } = await supabaseAdmin
                .from("user_favorite_courses")
                .insert({
                    user_id: userId,
                    course_id: courseId,
                })
                .select()
                .single();

            // Ignore duplicate errors
            if (error && error.code !== '23505') throw error;
            return data || null;
        } catch (error) {
            handleError(error, "addFavorite");
        }
    }

    // Remove from favorites
    async removeFavorite(userId, courseId) {
        try {
            const { data, error } = await supabaseAdmin
                .from("user_favorite_courses")
                .delete()
                .eq("user_id", userId)
                .eq("course_id", courseId)
                .select()
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data || null;
        } catch (error) {
            handleError(error, "removeFavorite");
        }
    }

    // Get user's favorite courses
    async getUserFavorites(userId) {
        try {
            const { data, error } = await supabaseAdmin
                .from("user_favorite_courses")
                .select(`
                    golf_courses (*)
                `)
                .eq("user_id", userId)
                .order("golf_courses(name)", { ascending: true });

            if (error) throw error;
            
            // Flatten the nested structure
            return (data || []).map(fav => fav.golf_courses).filter(Boolean);
        } catch (error) {
            handleError(error, "getUserFavorites");
        }
    }
}

module.exports = new CourseRepository();
