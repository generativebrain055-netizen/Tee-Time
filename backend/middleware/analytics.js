const { supabaseAdmin } = require("../config/supabase");
const logger = require("../config/logger");

/** Matches DB column width (see migrations/018_analytics_event_name_length.sql). */
const MAX_EVENT_NAME_LENGTH = 512;

function clampEventName(name) {
  const s = name == null ? "" : String(name);
  return s.length <= MAX_EVENT_NAME_LENGTH
    ? s
    : s.slice(0, MAX_EVENT_NAME_LENGTH);
}

/**
 * Analytics Middleware
 * Logs events to analytics_events table
 */

/**
 * Log analytics event
 * @param {Object} eventData
 */
const logEvent = async (eventData) => {
  try {
    const {
      userId,
      eventCategory,
      eventName,
      eventData: data,
      ipAddress,
      userAgent,
      deviceId,
      sessionId,
    } = eventData;

    const { error } = await supabaseAdmin
      .from("analytics_events")
      .insert({
        user_id: userId || null,
        event_name: clampEventName(eventName),
        event_category: eventCategory || null,
        event_properties: data || {},
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
        device_id: deviceId || null,
        session_id: sessionId || null,
      });

    if (error) {
      logger.error("Failed to log analytics event", { errorMessage: error?.message || String(error), code: error?.code });
    }
  } catch (error) {
    // Don't throw errors for analytics failures (log plain object to avoid Winston serializing Error oddly)
    logger.error("Failed to log analytics event", { errorMessage: error?.message || String(error), code: error?.code });
  }
};

/**
 * Middleware to log authentication events
 */
const logAuthEvent = (eventName) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to capture response
    res.json = function (body) {
      // Log event after response
      setImmediate(async () => {
        try {
          const success = body.success !== false;
          const userId = req.user?.id || body.user?.id || body.userId;

          await logEvent({
            userId,
            eventCategory: "auth",
            eventName,
            eventData: {
              success,
              statusCode: res.statusCode,
              method: req.method,
              path: req.path,
              ...(body.error && { error: body.error.message }),
            },
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers["user-agent"],
            deviceId: req.session?.deviceId,
            sessionId: req.session?.id,
          });
        } catch (error) {
          logger.error("Error logging auth event", { errorMessage: error?.message || String(error) });
        }
      });

      // Call original json method
      return originalJson(body);
    };

    next();
  };
};

/**
 * Middleware to log API requests
 */
const logApiRequest = async (req, res, next) => {
  const startTime = Date.now();

  // Store original json method
  const originalJson = res.json.bind(res);

  // Override json method
  res.json = function (body) {
    const duration = Date.now() - startTime;

    // Log event after response
    setImmediate(async () => {
      try {
        await logEvent({
          userId: req.user?.id,
          eventCategory: "api",
          eventName: `${req.method} ${req.path}`,
          eventData: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
            success: res.statusCode < 400,
          },
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.headers["user-agent"],
          deviceId: req.session?.deviceId,
          sessionId: req.session?.id,
        });
      } catch (error) {
        logger.error("Error logging API request", { errorMessage: error?.message || String(error) });
      }
    });

    return originalJson(body);
  };

  next();
};

/**
 * Log custom event
 */
const logCustomEvent = async (req, eventCategory, eventName, eventData = {}) => {
  await logEvent({
    userId: req.user?.id,
    eventCategory,
    eventName,
    eventData,
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.headers["user-agent"],
    deviceId: req.session?.deviceId,
    sessionId: req.session?.id,
  });
};

/**
 * Get analytics statistics
 */
const getAnalyticsStats = async (filters = {}) => {
  const { startDate, endDate, eventCategory, eventName, userId } = filters;

  let query = supabaseAdmin.from("analytics_events").select("*");

  if (startDate) {
    query = query.gte("created_at", startDate);
  }

  if (endDate) {
    query = query.lte("created_at", endDate);
  }

  if (eventCategory) {
    query = query.eq("event_category", eventCategory);
  }

  if (eventName) {
    query = query.eq("event_name", eventName);
  }

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query.limit(100);

  if (error) {
    logger.error("Error getting analytics stats", { errorMessage: error?.message || String(error) });
    return [];
  }

  // Aggregate results
  const stats = {};
  (data || []).forEach(event => {
    const key = `${event.event_category}:${event.event_name}`;
    if (!stats[key]) {
      stats[key] = {
        event_category: event.event_category,
        event_name: event.event_name,
        event_count: 0,
        unique_users: new Set(),
        unique_sessions: new Set(),
      };
    }
    stats[key].event_count++;
    if (event.user_id) stats[key].unique_users.add(event.user_id);
    if (event.session_id) stats[key].unique_sessions.add(event.session_id);
  });

  return Object.values(stats).map(s => ({
    ...s,
    unique_users: s.unique_users.size,
    unique_sessions: s.unique_sessions.size,
    total_events: s.event_count,
  }));
};

module.exports = {
  logEvent,
  logAuthEvent,
  logApiRequest,
  logCustomEvent,
  getAnalyticsStats,
};
