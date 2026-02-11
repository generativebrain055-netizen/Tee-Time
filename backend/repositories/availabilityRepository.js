const { supabaseAdmin, handleError } = require('../config/supabase');

/**
 * Availability Repository
 * Handles all database operations for user availability using Supabase REST API
 * All methods use parameterized queries via Supabase SDK (no raw SQL)
 * Input validation and sanitization performed at controller level
 */
class AvailabilityRepository {
    /**
     * Get user's current availability
     * @param {string} userId - Validated UUID from controller
     */
    async getUserAvailability(userId) {
        try {
            if (!userId) {
                throw new Error('User ID is required');
            }

            const { data, error } = await supabaseAdmin
                .from('user_availability')
                .select('id, day_of_week, time_slot, is_active, created_at, updated_at')
                .eq('user_id', userId)
                .eq('is_active', true)
                .order('day_of_week')
                .order('time_slot');

            if (error) throw error;
            
            // Sort by day order (Mon-Sun) and time slot order
            const dayOrder = { 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6, 'Sun': 7 };
            const timeOrder = { 'morning': 1, 'late_morning': 2, 'afternoon': 3, 'late_afternoon': 4, 'evening': 5 };
            
            return (data || []).sort((a, b) => {
                const dayDiff = dayOrder[a.day_of_week] - dayOrder[b.day_of_week];
                if (dayDiff !== 0) return dayDiff;
                return timeOrder[a.time_slot] - timeOrder[b.time_slot];
            });
        } catch (error) {
            handleError(error, 'getUserAvailability');
        }
    }

    /**
     * Save or update user availability
     * @param {string} userId - Validated UUID from controller
     * @param {Array} availabilityData - Sanitized array [{dayOfWeek: 'Mon', timeSlots: ['morning']}]
     */
    async saveAvailability(userId, availabilityData) {
        try {
            if (!userId) {
                throw new Error('User ID is required');
            }
            if (!Array.isArray(availabilityData)) {
                throw new Error('Availability data must be an array');
            }

            // First, mark all existing availability as inactive (soft delete)
            const { error: updateError } = await supabaseAdmin
                .from('user_availability')
                .update({ is_active: false, updated_at: new Date().toISOString() })
                .eq('user_id', userId);

            if (updateError) throw updateError;

            // Then insert or upsert new availability
            const recordsToUpsert = [];
            for (const dayData of availabilityData) {
                const { dayOfWeek, timeSlots } = dayData;
                
                for (const timeSlot of timeSlots) {
                    recordsToUpsert.push({
                        user_id: userId,
                        day_of_week: dayOfWeek,
                        time_slot: timeSlot,
                        is_active: true
                    });
                }
            }

            if (recordsToUpsert.length > 0) {
                const { error: upsertError } = await supabaseAdmin
                    .from('user_availability')
                    .upsert(recordsToUpsert, {
                        onConflict: 'user_id,day_of_week,time_slot',
                        ignoreDuplicates: false
                    });

                if (upsertError) throw upsertError;
            }
            
            // Return updated availability
            return await this.getUserAvailability(userId);
        } catch (error) {
            handleError(error, 'saveAvailability');
        }
    }

    /**
     * Clear all user availability (soft delete)
     * @param {string} userId - Validated UUID from controller
     */
    async clearAvailability(userId) {
        try {
            if (!userId) {
                throw new Error('User ID is required');
            }

            const { error } = await supabaseAdmin
                .from('user_availability')
                .update({ is_active: false, updated_at: new Date().toISOString() })
                .eq('user_id', userId);

            if (error) throw error;
        } catch (error) {
            handleError(error, 'clearAvailability');
        }
    }

    /**
     * Get availability for multiple users
     * @param {Array<string>} userIds - Array of validated UUIDs from controller
     */
    async getMultipleUsersAvailability(userIds) {
        try {
            if (!userIds || userIds.length === 0) {
                return {};
            }
            if (!Array.isArray(userIds)) {
                throw new Error('User IDs must be an array');
            }

            const { data, error } = await supabaseAdmin
                .from('user_availability')
                .select('user_id, day_of_week, time_slot')
                .in('user_id', userIds)
                .eq('is_active', true)
                .order('user_id')
                .order('day_of_week')
                .order('time_slot');

            if (error) throw error;
            
            // Group by user_id
            const grouped = {};
            (data || []).forEach(row => {
                if (!grouped[row.user_id]) {
                    grouped[row.user_id] = [];
                }
                grouped[row.user_id].push({
                    dayOfWeek: row.day_of_week,
                    timeSlot: row.time_slot
                });
            });
            
            return grouped;
        } catch (error) {
            handleError(error, 'getMultipleUsersAvailability');
        }
    }
}

module.exports = new AvailabilityRepository();
