const { supabaseAdmin } = require('../config/supabase');
const logger = require('../config/logger');

// Onboarding Service - Backend is source of truth for completion state

// Get user's complete onboarding status
const getOnboardingStatus = async (userId) => {
    try {
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select(`
                id,
                onboarding_completed,
                onboarding_completed_at,
                availability_completed,
                availability_completed_at,
                profile_completed,
                profile_completed_at
            `)
            .eq('id', userId)
            .single();

        if (error) throw error;

        // Determine missing steps and next required step
        const missingSteps = [];
        if (!user.profile_completed) missingSteps.push('profile');
        if (!user.availability_completed) missingSteps.push('availability');

        let nextStep = null;
        if (!user.profile_completed) {
            nextStep = 'profile';
        } else if (!user.availability_completed) {
            nextStep = 'availability';
        }

        return {
            success: true,
            onboardingComplete: user.onboarding_completed || false,
            completedAt: user.onboarding_completed_at,
            steps: {
                profile: {
                    completed: user.profile_completed || false,
                    completedAt: user.profile_completed_at,
                    required: true,
                },
                availability: {
                    completed: user.availability_completed || false,
                    completedAt: user.availability_completed_at,
                    required: true,
                },
            },
            missingSteps,
            nextStep,
            requiresOnboarding: !user.onboarding_completed,
        };
    } catch (error) {
        logger.error('Error getting onboarding status:', error);
        throw error;
    }
};

// Mark profile setup as completed
const markProfileCompleted = async (userId) => {
    try {
        const { error } = await supabaseAdmin
            .from('users')
            .update({
                profile_completed: true,
                profile_completed_at: new Date().toISOString(),
            })
            .eq('id', userId);

        if (error) throw error;

        logger.info(`Profile completed for user ${userId}`);
        return await getOnboardingStatus(userId);
    } catch (error) {
        logger.error('Error marking profile completed:', error);
        throw error;
    }
};

// Mark availability as completed
const markAvailabilityCompleted = async (userId) => {
    try {
        const { error } = await supabaseAdmin
            .from('users')
            .update({
                availability_completed: true,
                availability_completed_at: new Date().toISOString(),
            })
            .eq('id', userId);

        if (error) throw error;

        logger.info(`Availability completed for user ${userId}`);
        return await getOnboardingStatus(userId);
    } catch (error) {
        logger.error('Error marking availability completed:', error);
        throw error;
    }
};

// Check if onboarding required - called on every login
const checkOnboardingRequired = async (userId) => {
    try {
        const status = await getOnboardingStatus(userId);
        
        return {
            required: status.requiresOnboarding,
            nextStep: status.nextStep,
            missingSteps: status.missingSteps,
        };
    } catch (error) {
        logger.error('Error checking onboarding required:', error);
        // On error, don't block user but log the issue
        return {
            required: false,
            nextStep: null,
            missingSteps: [],
            error: true,
        };
    }
};

// Record individual step completion with optional data
const recordStepCompletion = async (userId, stepName, data = {}) => {
    try {
        const { error } = await supabaseAdmin
            .from('onboarding_steps')
            .upsert({
                user_id: userId,
                step_name: stepName,
                completed: true,
                completed_at: new Date().toISOString(),
                data,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id,step_name'
            });

        if (error) throw error;
        logger.info(`Onboarding step '${stepName}' completed for user ${userId}`);
    } catch (error) {
        logger.error('Error recording step completion:', error);
        throw error;
    }
};

// Record step skip (only for optional steps like club name)
const recordStepSkip = async (userId, stepName) => {
    try {
        const { error } = await supabaseAdmin
            .from('onboarding_steps')
            .upsert({
                user_id: userId,
                step_name: stepName,
                skipped: true,
                skipped_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id,step_name'
            });

        if (error) throw error;
        logger.info(`Onboarding step '${stepName}' skipped for user ${userId}`);
    } catch (error) {
        logger.error('Error recording step skip:', error);
        throw error;
    }
};

// Get detailed step history for user
const getOnboardingSteps = async (userId) => {
    try {
        const { data: steps, error } = await supabaseAdmin
            .from('onboarding_steps')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        return {
            success: true,
            steps: steps || [],
        };
    } catch (error) {
        logger.error('Error getting onboarding steps:', error);
        throw error;
    }
};

module.exports = {
    getOnboardingStatus,
    markProfileCompleted,
    markAvailabilityCompleted,
    checkOnboardingRequired,
    recordStepCompletion,
    recordStepSkip,
    getOnboardingSteps,
};
