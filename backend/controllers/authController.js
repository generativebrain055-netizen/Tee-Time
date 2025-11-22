const twilio = require('twilio');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const otpRepository = require('../repositories/otpRepository');
const logger = require('../config/logger');

// Initialize Twilio client
let twilioClient = null;
let verifyService = null;

const initializeTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  
  if (!accountSid || !authToken) {
    logger.warn('Twilio credentials not configured. OTP will be logged to console.');
    return { client: null, verify: null };
  }
  
  if (!accountSid.startsWith('AC')) {
    logger.error('Invalid TWILIO_ACCOUNT_SID. Must start with AC');
    return { client: null, verify: null };
  }
  
  try {
    const client = twilio(accountSid, authToken);
    
    // Initialize Verify service if SID is provided
    const verify = verifyServiceSid 
      ? client.verify.v2.services(verifyServiceSid)
      : null;
    
    if (!verify) {
      logger.warn('TWILIO_VERIFY_SERVICE_SID not configured. Using fallback OTP method.');
    }
    
    return { client, verify };
  } catch (error) {
    logger.error('Failed to initialize Twilio client:', error);
    return { client: null, verify: null };
  }
};

const twilioInit = initializeTwilioClient();
twilioClient = twilioInit.client;
verifyService = twilioInit.verify;

/**
 * Generate a 6-digit OTP
 */
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Send OTP via Twilio Verify API or fallback to SMS
 */
const sendOTPViaTwilio = async (phoneNumber) => {
  // Method 1: Use Twilio Verify API (Recommended)
  if (verifyService) {
    try {
      const verification = await verifyService.verifications.create({
        to: phoneNumber,
        channel: 'sms',
      });
      
      logger.info(`OTP sent via Verify API to ${phoneNumber}. Status: ${verification.status}`);
      return { 
        success: true, 
        mode: 'verify_api', 
        status: verification.status,
        sid: verification.sid 
      };
    } catch (error) {
      logger.error(`Twilio Verify API error for ${phoneNumber}:`, error);
      
      // Fallback to manual OTP in development
      if (process.env.NODE_ENV === 'development') {
        const otp = generateOTP();
        logger.info(`\n🔐 [VERIFY API FAILED - FALLBACK] OTP for ${phoneNumber}: ${otp}\n`);
        return { success: true, mode: 'console_fallback', otp };
      }
      
      throw error;
    }
  }
  
  // Method 2: Manual OTP with Messages API (Fallback)
  if (twilioClient) {
    const fromNumber = process.env.TWILIO_FROM_NUMBER;
    
    if (!fromNumber) {
      throw new Error('TWILIO_FROM_NUMBER not configured');
    }
    
    const otp = generateOTP();
    
    try {
      const message = await twilioClient.messages.create({
        body: `Your TeeTime Golf verification code is: ${otp}. Valid for 5 minutes.`,
        from: fromNumber,
        to: phoneNumber,
      });
      
      logger.info(`OTP sent via Messages API to ${phoneNumber}. SID: ${message.sid}`);
      return { success: true, mode: 'messages_api', sid: message.sid, otp };
    } catch (error) {
      logger.error(`Twilio Messages API error for ${phoneNumber}:`, error);
      
      // Fallback to console in development
      if (process.env.NODE_ENV === 'development') {
        logger.info(`\n🔐 [MESSAGES API FAILED - FALLBACK] OTP for ${phoneNumber}: ${otp}\n`);
        return { success: true, mode: 'console_fallback', otp };
      }
      
      throw error;
    }
  }
  
  // Method 3: Development mode - log OTP to console
  const otp = generateOTP();
  logger.info(`\n🔐 [DEVELOPMENT MODE] OTP for ${phoneNumber}: ${otp}\n`);
  return { success: true, mode: 'console', otp };
};

/**
 * Verify OTP via Twilio Verify API
 */
const verifyOTPViaTwilio = async (phoneNumber, otp) => {
  if (!verifyService) {
    return null; // Will use manual verification
  }
  
  try {
    const verificationCheck = await verifyService.verificationChecks.create({
      to: phoneNumber,
      code: otp,
    });
    
    logger.info(`OTP verification for ${phoneNumber}. Status: ${verificationCheck.status}`);
    return verificationCheck.status === 'approved';
  } catch (error) {
    logger.error(`Twilio Verify check error for ${phoneNumber}:`, error);
    return null; // Will fallback to manual verification
  }
};

/**
 * Request OTP
 */
const requestOTP = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    // Check rate limiting
    const isPhoneRateLimited = await otpRepository.isPhoneRateLimited(
      phoneNumber,
      parseInt(process.env.OTP_RATE_LIMIT_PER_HOUR) || 5
    );
    
    if (isPhoneRateLimited) {
      return res.status(429).json({
        success: false,
        message: 'Too many OTP requests. Please try again later.',
      });
    }
    
    // Check if user already exists
    const existingUser = await userRepository.findByPhoneNumber(phoneNumber);
    
    if (existingUser && existingUser.password_hash) {
      return res.status(400).json({
        success: false,
        message: 'Account already exists. Please login with your password.',
      });
    }
    
    // Send OTP via Twilio
    const sendResult = await sendOTPViaTwilio(phoneNumber);
    
    // If using Verify API, we don't need to store OTP hash
    // If using manual method, store the OTP hash
    if (sendResult.otp) {
      const otpHash = await bcrypt.hash(sendResult.otp, 10);
      const expiresAt = new Date(Date.now() + (parseInt(process.env.OTP_TTL_MS) || 300000));
      
      await otpRepository.create({
        phoneNumber,
        userId: existingUser?.id || null,
        otpCodeHash: otpHash,
        purpose: 'signup',
        expiresAt,
        ipAddress,
        maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS) || 5,
      });
    }
    
    const isDevelopmentMode = sendResult.mode === 'console' || sendResult.mode === 'console_fallback';
    
    return res.json({
      success: true,
      message: isDevelopmentMode
        ? 'OTP generated. Check server console for code.'
        : 'OTP sent successfully to your phone.',
      mode: sendResult.mode,
      expiresInSeconds: parseInt(process.env.OTP_TTL_MS) / 1000 || 300,
      resendAfterSeconds: parseInt(process.env.OTP_RESEND_SECONDS) || 30,
    });
  } catch (error) {
    logger.error('Error in requestOTP:', error);
    next(error);
  }
};

/**
 * Verify OTP
 */
const verifyOTP = async (req, res, next) => {
  try {
    const { phoneNumber, otp } = req.body;
    
    // Try Twilio Verify API first
    const twilioVerified = await verifyOTPViaTwilio(phoneNumber, otp);
    
    if (twilioVerified === true) {
      // OTP verified via Twilio Verify API
      const sessionToken = crypto.randomBytes(32).toString('hex');
      
      return res.json({
        success: true,
        message: 'OTP verified successfully. Please set your password.',
        otpSessionToken: sessionToken,
        phoneNumber,
      });
    }
    
    // Fallback to manual verification (if Verify API not available or failed)
    const otpRecord = await otpRepository.findLatestValid(phoneNumber, 'signup');
    
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired or not found. Please request a new one.',
      });
    }
    
    // Check max attempts
    if (otpRecord.attempts >= otpRecord.max_attempts) {
      return res.status(400).json({
        success: false,
        message: 'Too many failed attempts. Please request a new OTP.',
      });
    }
    
    // Verify OTP
    const isValid = await bcrypt.compare(otp, otpRecord.otp_code_hash);
    
    if (!isValid) {
      await otpRepository.incrementAttempts(otpRecord.id);
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please try again.',
        attemptsRemaining: otpRecord.max_attempts - otpRecord.attempts - 1,
      });
    }
    
    // Mark OTP as verified
    await otpRepository.markAsVerified(otpRecord.id);
    
    // Create temporary session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    return res.json({
      success: true,
      message: 'OTP verified successfully. Please set your password.',
      otpSessionToken: sessionToken,
      phoneNumber,
    });
  } catch (error) {
    logger.error('Error in verifyOTP:', error);
    next(error);
  }
};

/**
 * Set Password (after OTP verification)
 */
const setPassword = async (req, res, next) => {
  try {
    const { phoneNumber, password, otpSessionToken } = req.body;
    
    // Validate password
    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create or update user
    let user = await userRepository.findByPhoneNumber(phoneNumber);
    
    if (user) {
      user = await userRepository.updatePassword(user.id, passwordHash);
    } else {
      user = await userRepository.create({
        phoneNumber,
        passwordHash,
      });
    }
    
    return res.json({
      success: true,
      message: 'Password set successfully. You can now login.',
      userId: user.id,
    });
  } catch (error) {
    logger.error('Error in setPassword:', error);
    next(error);
  }
};

/**
 * Login with phone and password
 */
const login = async (req, res, next) => {
  try {
    const { phoneNumber, password } = req.body;
    
    const user = await userRepository.findByPhoneNumber(phoneNumber);
    
    if (!user || !user.password_hash) {
      return res.status(401).json({
        success: false,
        message: 'Invalid phone number or password.',
      });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid phone number or password.',
      });
    }
    
    // Generate session token (implement JWT or session management)
    const token = crypto.randomBytes(32).toString('hex');
    
    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        phoneNumber: user.phone_number,
      },
    });
  } catch (error) {
    logger.error('Error in login:', error);
    next(error);
  }
};

// Placeholder functions for other auth methods
const refreshToken = async (req, res, next) => {
  res.status(501).json({ message: 'Not implemented yet' });
};

const logout = async (req, res, next) => {
  res.status(501).json({ message: 'Not implemented yet' });
};

const logoutAll = async (req, res, next) => {
  res.status(501).json({ message: 'Not implemented yet' });
};

const getCurrentUser = async (req, res, next) => {
  res.status(501).json({ message: 'Not implemented yet' });
};

const requestMagicLink = async (req, res, next) => {
  res.status(501).json({ message: 'Not implemented yet' });
};

const verifyMagicLink = async (req, res, next) => {
  res.status(501).json({ message: 'Not implemented yet' });
};

module.exports = {
  requestOTP,
  verifyOTP,
  setPassword,
  login,
  refreshToken,
  logout,
  logoutAll,
  getCurrentUser,
  requestMagicLink,
  verifyMagicLink,
};
