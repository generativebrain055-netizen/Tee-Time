/**
 * Security Scanner Blocker Middleware
 * Blocks common security scanner/bot requests before they reach routes
 */

const logger = require("../config/logger");

/**
 * Common security scan paths that should be blocked immediately
 */
const SECURITY_SCAN_PATTERNS = [
  /^\/\.env/i,
  /^\/\.git/i,
  /^\/\.github/i,
  /^\/\.gitlab/i,
  /^\/\.ssh/i,
  /^\/\.htaccess/i,
  /^\/\.well-known\/openid-configuration/i,
  /^\/\.vscode/i,
  /^\/\.idea/i,
  /^\/\.npmrc/i,
  /^\/\.travis/i,
  /^\/\.gitignore/i,
  /^\/\.gitlab-ci/i,
  /^\/\.hg/i,
  /^\/\.svn/i,
  /^\/\.next/i,
  /^\/\.nuxt/i,
  /^\/\.vite/i,
  /^\/\.local/i,
  /^\/\.production/i,
  /^\/\.remote/i,
  /^\/\.phpinfo/i,
  /^\/\.pypirc/i,
  /^\/\.well-known\/security\.txt/i,
];

/**
 * Check if a path matches security scan patterns
 */
const isSecurityScanPath = (path) => {
  return SECURITY_SCAN_PATTERNS.some(pattern => pattern.test(path));
};

/**
 * Security Scanner Blocker Middleware
 * Returns 404 immediately for known scanner paths without logging as error
 */
const securityScannerBlocker = (req, res, next) => {
  if (isSecurityScanPath(req.path)) {
    // Log at info level (not error) since these are expected scanner attempts
    logger.info("Security scan attempt blocked", {
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('user-agent')?.substring(0, 100), // Limit length
    });

    // Return 404 immediately without going through error handler
    return res.status(404).json({
      success: false,
      error: {
        message: "Not found",
        code: "NOT_FOUND",
      },
    });
  }

  // Not a scanner path, continue to next middleware
  next();
};

module.exports = securityScannerBlocker;
