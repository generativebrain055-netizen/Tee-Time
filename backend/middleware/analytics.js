const { query } = require('../config/database');
const logger = require('../config/logger');

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
      eventType,
      eventCategory,
      eventName,
      eventData: data,
      ipAddress,
      userAgent,
      deviceId,
      sessionId,
    } = eventData;

    await query(
      `INSERT INTO analytics_events (
        user_id, event_type, event_category, event_name, event_data,
        ip_address, user_agent, device_id, session_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        userId || null,
        eventType,
        eventCategory,
        eventName,
        data ? JSON.stringify(data) : null,
        ipAddress || null,
        userAgent || null,
        deviceId || null,
        sessionId || null,
      ]
    );
  } catch (error) {
    // Don't throw errors for analytics failures
    logger.error('Failed to log analytics event:', error);
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
            eventType: 'auth',
            eventCategory: 'authentication',
            eventName,
            eventData: {
              success,
              statusCode: res.statusCode,
              method: req.method,
              path: req.path,
              ...(body.error && { error: body.error.message }),
            },
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
            deviceId: req.session?.deviceId,
            sessionId: req.session?.id,
          });
        } catch (error) {
          logger.error('Error logging auth event:', error);
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
          eventType: 'api',
          eventCategory: 'request',
          eventName: `${req.method} ${req.path}`,
          eventData: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
            success: res.statusCode < 400,
          },
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'],
          deviceId: req.session?.deviceId,
          sessionId: req.session?.id,
        });
      } catch (error) {
        logger.error('Error logging API request:', error);
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
    eventType: 'custom',
    eventCategory,
    eventName,
    eventData,
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    deviceId: req.session?.deviceId,
    sessionId: req.session?.id,
  });
};

/**
 * Get analytics statistics
 */
const getAnalyticsStats = async (filters = {}) => {
  const { startDate, endDate, eventType, eventCategory, userId } = filters;

  let whereClause = 'WHERE 1=1';
  const params = [];
  let paramIndex = 1;

  if (startDate) {
    whereClause += ` AND created_at >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    whereClause += ` AND created_at <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }

  if (eventType) {
    whereClause += ` AND event_type = $${paramIndex}`;
    params.push(eventType);
    paramIndex++;
  }

  if (eventCategory) {
    whereClause += ` AND event_category = $${paramIndex}`;
    params.push(eventCategory);
    paramIndex++;
  }

  if (userId) {
    whereClause += ` AND user_id = $${paramIndex}`;
    params.push(userId);
    paramIndex++;
  }

  const result = await query(
    `SELECT 
      COUNT(*) as total_events,
      COUNT(DISTINCT user_id) as unique_users,
      COUNT(DISTINCT session_id) as unique_sessions,
      event_type,
      event_category,
      event_name,
      COUNT(*) as event_count
    FROM analytics_events
    ${whereClause}
    GROUP BY event_type, event_category, event_name
    ORDER BY event_count DESC
    LIMIT 100`,
    params
  );

  return result.rows;
};

module.exports = {
  logEvent,
  logAuthEvent,
  logApiRequest,
  logCustomEvent,
  getAnalyticsStats,
};
