const { pool } = require("../config/database");

class CourseRepository {
    // Search courses by name/location
    async searchCourses(query, limit = 10) {
        const sql = `
            SELECT id, name, address, city, state, country, postal_code,
                   latitude, longitude, phone, website, holes, par,
                   course_type, price_range, rating, google_place_id
            FROM golf_courses
            WHERE name ILIKE $1 OR city ILIKE $1 OR address ILIKE $1
            ORDER BY rating DESC NULLS LAST, name
            LIMIT $2
        `;
        const result = await pool.query(sql, [`%${query}%`, limit]);
        return result.rows;
    }

    // Get course by ID
    async getCourseById(courseId) {
        const query = `SELECT * FROM golf_courses WHERE id = $1`;
        const result = await pool.query(query, [courseId]);
        return result.rows[0];
    }

    // Get course by Google Place ID
    async getCourseByPlaceId(placeId) {
        const query = `SELECT * FROM golf_courses WHERE google_place_id = $1`;
        const result = await pool.query(query, [placeId]);
        return result.rows[0];
    }

    // Create or update course from Google Places
    async upsertCourse(courseData) {
        const {
            name, address, city, state, country, postalCode,
            latitude, longitude, phone, website, googlePlaceId,
            rating, priceRange
        } = courseData;

        const query = `
            INSERT INTO golf_courses (
                name, address, city, state, country, postal_code,
                latitude, longitude, phone, website, google_place_id,
                rating, price_range
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (google_place_id) DO UPDATE SET
                name = EXCLUDED.name,
                address = EXCLUDED.address,
                rating = EXCLUDED.rating,
                updated_at = NOW()
            RETURNING *
        `;
        const result = await pool.query(query, [
            name, address, city, state, country || 'USA', postalCode,
            latitude, longitude, phone, website, googlePlaceId,
            rating, priceRange
        ]);
        return result.rows[0];
    }

    // Get nearby courses
    async getNearbyCourses(latitude, longitude, radiusMiles = 25, limit = 20) {
        // Haversine formula for distance calculation using subquery
        const query = `
            SELECT * FROM (
                SELECT *, 
                       (3959 * acos(
                           cos(radians($1)) * cos(radians(latitude)) * 
                           cos(radians(longitude) - radians($2)) + 
                           sin(radians($1)) * sin(radians(latitude))
                       )) AS distance_miles
                FROM golf_courses
                WHERE latitude IS NOT NULL AND longitude IS NOT NULL
            ) AS courses_with_distance
            WHERE distance_miles < $3
            ORDER BY distance_miles
            LIMIT $4
        `;
        const result = await pool.query(query, [latitude, longitude, radiusMiles, limit]);
        return result.rows;
    }

    // Get popular courses
    async getPopularCourses(limit = 10) {
        const query = `
            SELECT gc.*, COUNT(tt.id) as tee_time_count
            FROM golf_courses gc
            LEFT JOIN tee_times tt ON tt.course_name ILIKE gc.name
            GROUP BY gc.id
            ORDER BY tee_time_count DESC, gc.rating DESC NULLS LAST
            LIMIT $1
        `;
        const result = await pool.query(query, [limit]);
        return result.rows;
    }

    // Add to user favorites
    async addFavorite(userId, courseId) {
        const query = `
            INSERT INTO user_favorite_courses (user_id, course_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
            RETURNING *
        `;
        const result = await pool.query(query, [userId, courseId]);
        return result.rows[0];
    }

    // Remove from favorites
    async removeFavorite(userId, courseId) {
        const query = `
            DELETE FROM user_favorite_courses 
            WHERE user_id = $1 AND course_id = $2
            RETURNING *
        `;
        const result = await pool.query(query, [userId, courseId]);
        return result.rows[0];
    }

    // Get user's favorite courses
    async getUserFavorites(userId) {
        const query = `
            SELECT gc.* FROM golf_courses gc
            JOIN user_favorite_courses ufc ON gc.id = ufc.course_id
            WHERE ufc.user_id = $1
            ORDER BY gc.name
        `;
        const result = await pool.query(query, [userId]);
        return result.rows;
    }
}

module.exports = new CourseRepository();
