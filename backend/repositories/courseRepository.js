const { supabaseAdmin, handleError } = require("../config/supabase");
const logger = require("../config/logger");

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

    // ---------- API-compatible with legacy clubs (CSV) shape for mobile/admin ----------
    // Search clubs (same response shape as former clubsService.searchClubs)
    async searchClubs(query, limit = 20) {
        try {
            const rows = await this.searchCourses(query, limit);
            return (rows || []).map((row) => ({
                id: row.id,
                name: row.name,
                location: [row.city, row.state].filter(Boolean).join(", ") || row.country || "USA",
                address: row.address || null,
                city: row.city || null,
                state: row.state || null,
                latitude: row.latitude != null ? parseFloat(row.latitude) : null,
                longitude: row.longitude != null ? parseFloat(row.longitude) : null,
                website: row.website || null,
                telephone: row.phone || null,
            }));
        } catch (error) {
            logger.error("searchClubs error:", error?.message || error);
            return [];
        }
    }

    // Search cities (distinct city, state from golf_courses)
    async searchCities(query, limit = 20) {
        try {
            if (!query || String(query).trim().length < 2) return [];
            const pattern = `%${String(query).trim()}%`;
            const { data, error } = await supabaseAdmin
                .from("golf_courses")
                .select("city, state")
                .or(`city.ilike.${pattern},state.ilike.${pattern}`)
                .not("city", "is", null)
                .limit(500);
            if (error) throw error;
            const seen = new Set();
            const out = [];
            for (const row of data || []) {
                const name = [row.city, row.state].filter(Boolean).join(", ");
                if (!name || seen.has(name)) continue;
                seen.add(name);
                out.push({
                    id: name.replace(/\s+/g, "-").toLowerCase(),
                    name,
                    city: row.city,
                    state: row.state,
                });
                if (out.length >= limit) break;
            }
            return out;
        } catch (error) {
            logger.error("searchCities error:", error?.message || error);
            return [];
        }
    }

    // Popular cities (by course count)
    async getPopularCities(limit = 20) {
        try {
            const { data, error } = await supabaseAdmin
                .from("golf_courses")
                .select("city, state")
                .not("city", "is", null)
                .not("state", "is", null)
                .limit(5000);
            if (error) throw error;
            const countByKey = new Map();
            for (const row of data || []) {
                const key = `${row.city}|${row.state}`;
                countByKey.set(key, (countByKey.get(key) || 0) + 1);
            }
            const entries = Array.from(countByKey.entries())
                .map(([key, clubCount]) => {
                    const [city, state] = key.split("|");
                    const name = `${city}, ${state}`;
                    return {
                        id: key.replace(/\s+/g, "-"),
                        name,
                        city,
                        state: (state || "").toUpperCase(),
                        clubCount,
                    };
                })
                .sort((a, b) => b.clubCount - a.clubCount)
                .slice(0, limit);
            return entries;
        } catch (error) {
            logger.error("getPopularCities error:", error?.message || error);
            return [];
        }
    }

    // Stats for clubs/courses (database)
    async getCourseStats() {
        try {
            const { count: totalClubs, error: e1 } = await supabaseAdmin
                .from("golf_courses")
                .select("id", { count: "exact", head: true });
            if (e1) throw e1;
            const { data: cityRows, error: e2 } = await supabaseAdmin
                .from("golf_courses")
                .select("city, state")
                .not("city", "is", null);
            if (e2) throw e2;
            const citySet = new Set();
            for (const row of cityRows || []) {
                citySet.add([row.city, row.state].filter(Boolean).join(", "));
            }
            return {
                totalClubs: totalClubs ?? 0,
                totalCities: citySet.size,
                totalStates: new Set((cityRows || []).map((r) => r.state).filter(Boolean)).size,
                loaded: true,
            };
        } catch (error) {
            logger.error("getCourseStats error:", error?.message || error);
            return { totalClubs: 0, totalCities: 0, totalStates: 0, loaded: false };
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

    // ---------- Admin: list courses with optional search and pagination ----------
    async listCourses(q = "", limit = 50, offset = 0) {
        try {
            const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
            const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);
            let query = supabaseAdmin
                .from("golf_courses")
                .select("id, name, address, city, state, country, postal_code, latitude, longitude, phone, website, holes, par, course_type, price_range, rating, google_place_id, created_at", { count: "exact" })
                .order("name", { ascending: true })
                .range(safeOffset, safeOffset + safeLimit - 1);
            const sanitized = typeof q === "string" ? String(q).trim().replace(/%/g, "") : "";
            if (sanitized) {
                const pattern = `%${sanitized}%`;
                query = query.or(`name.ilike.${pattern},city.ilike.${pattern},state.ilike.${pattern},address.ilike.${pattern}`);
            }
            const { data, error, count } = await query;
            if (error) throw error;
            return { courses: data || [], total: count ?? 0 };
        } catch (error) {
            handleError(error, "listCourses");
        }
    }

    // ---------- Admin: create course ----------
    async createCourse(body) {
        try {
            const { data, error } = await supabaseAdmin
                .from("golf_courses")
                .insert({
                    name: body.name || null,
                    address: body.address || null,
                    city: body.city || null,
                    state: body.state || null,
                    country: body.country || "USA",
                    postal_code: body.postal_code || null,
                    latitude: body.latitude != null ? parseFloat(body.latitude) : null,
                    longitude: body.longitude != null ? parseFloat(body.longitude) : null,
                    phone: body.phone || null,
                    website: body.website || null,
                    holes: body.holes != null ? parseInt(body.holes, 10) : 18,
                    par: body.par != null ? parseInt(body.par, 10) : null,
                    course_type: body.course_type || null,
                    price_range: body.price_range || null,
                    rating: body.rating != null ? parseFloat(body.rating) : null,
                    google_place_id: body.google_place_id || null,
                })
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            handleError(error, "createCourse");
        }
    }

    // ---------- Admin: update course ----------
    async updateCourse(id, body) {
        try {
            const updates = {};
            if (body.name !== undefined) updates.name = body.name;
            if (body.address !== undefined) updates.address = body.address;
            if (body.city !== undefined) updates.city = body.city;
            if (body.state !== undefined) updates.state = body.state;
            if (body.country !== undefined) updates.country = body.country;
            if (body.postal_code !== undefined) updates.postal_code = body.postal_code;
            if (body.latitude !== undefined) updates.latitude = body.latitude != null ? parseFloat(body.latitude) : null;
            if (body.longitude !== undefined) updates.longitude = body.longitude != null ? parseFloat(body.longitude) : null;
            if (body.phone !== undefined) updates.phone = body.phone;
            if (body.website !== undefined) updates.website = body.website;
            if (body.holes !== undefined) updates.holes = body.holes != null ? parseInt(body.holes, 10) : null;
            if (body.par !== undefined) updates.par = body.par != null ? parseInt(body.par, 10) : null;
            if (body.course_type !== undefined) updates.course_type = body.course_type;
            if (body.price_range !== undefined) updates.price_range = body.price_range;
            if (body.rating !== undefined) updates.rating = body.rating != null ? parseFloat(body.rating) : null;
            if (body.google_place_id !== undefined) updates.google_place_id = body.google_place_id || null;
            if (Object.keys(updates).length === 0) return this.getCourseById(id);
            const { data, error } = await supabaseAdmin
                .from("golf_courses")
                .update(updates)
                .eq("id", id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            handleError(error, "updateCourse");
        }
    }

    // ---------- Admin: delete course ----------
    async deleteCourse(id) {
        try {
            const { error } = await supabaseAdmin
                .from("golf_courses")
                .delete()
                .eq("id", id);
            if (error) throw error;
            return true;
        } catch (error) {
            handleError(error, "deleteCourse");
        }
    }
}

module.exports = new CourseRepository();
