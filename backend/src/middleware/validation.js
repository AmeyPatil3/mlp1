import { body, validationResult } from 'express-validator';

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

export const validateUserRegistration = [
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('mobile')
    .isLength({ min: 10, max: 15 })
    .withMessage('Please provide a valid mobile number'),
  handleValidationErrors
];

export const validateTherapistRegistration = [
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('education')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Education must be between 10 and 500 characters'),
  body('specialties')
    .custom((value) => {
      if (!Array.isArray(value) || value.length === 0) {
        throw new Error('At least one specialty is required');
      }
      return true;
    }),
  body('experienceYears')
    .isNumeric()
    .withMessage('Experience years must be a number')
    .custom((value) => {
      const num = parseInt(value);
      if (isNaN(num) || num < 0 || num > 50) {
        throw new Error('Experience years must be between 0 and 50');
      }
      return true;
    }),
  handleValidationErrors
];

export const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  body('role')
    .isIn(['user', 'therapist'])
    .withMessage('Role must be either user or therapist'),
  handleValidationErrors
];

export const validateRoomCreation = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Room name must be between 3 and 100 characters'),
  body('topic')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Room topic must be between 5 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('maxParticipants')
    .optional()
    .isInt({ min: 2, max: 50 })
    .withMessage('Max participants must be between 2 and 50'),
  handleValidationErrors
];

export const validateAppointment = [
  body('therapistId')
    .isMongoId()
    .withMessage('Valid therapist ID is required'),
  body('scheduledDate')
    .isISO8601()
    .withMessage('Valid scheduled date is required')
    .custom((value) => {
      const scheduledDate = new Date(value);
      const now = new Date();
      if (scheduledDate <= now) {
        throw new Error('Scheduled date must be in the future');
      }
      return true;
    }),
  body('duration')
    .optional()
    .isInt({ min: 15, max: 180 })
    .withMessage('Duration must be between 15 and 180 minutes'),
  body('type')
    .optional()
    .isIn(['video', 'audio', 'chat'])
    .withMessage('Type must be video, audio, or chat'),
  handleValidationErrors
];
