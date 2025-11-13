const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

// Security headers
const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false
});

// Rate limiting
const authLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5,
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        message: 'Too many requests, please try again later.'
    }
});

// Input validation
const validateUserRegistration = [
    body('name').trim().isLength({ min: 2, max: 100 }).escape(),

    body('email').isEmail().normalizeEmail(),

body('phone')
    .isMobilePhone('any')
    .withMessage('Please provide a valid mobile phone number')
    .isLength({ min: 10, max: 10 })
    .withMessage('Phone number must be exactly 10 digits')
    .custom((value) => {
        // Rwandan mobile operators: 
        // 072 - MTN
        // 073 - Airtel  
        // 078 - MTN
        // 079 - Airtel
        if (!/^07[2389]\d{7}$/.test(value)) {
            throw new Error('Phone number must be a valid Rwandan number (072, 073, 078, or 079)');
        }
        return true;
    }),

    body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),

    body('insuranceNumber').optional().trim().escape()
];

const validateLogin = [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
];

const validateBooking = [
    body('patientName').trim().isLength({ min: 2, max: 100 }).escape(),
    body('patientPhone').isMobilePhone('any'),
    body('testId').isInt({ min: 1 }),
    body('appointmentDate').isDate()
];

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

module.exports = {
    securityHeaders,
    authLimiter,
    apiLimiter,
    validateUserRegistration,
    validateLogin,
    validateBooking,
    handleValidationErrors
};
