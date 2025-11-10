import express from 'express';
import User from '../models/User.js';
import Therapist from '../models/Therapist.js';
import { authenticateToken, authorizeRoles, optionalAuth } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { body } from 'express-validator';

const router = express.Router();

// @desc    Get all therapists
// @route   GET /api/therapists
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { specialty, experience, search, page = 1, limit = 10 } = req.query;
    
    // Build filter object
    let filter = {};
    
    if (specialty) {
      filter.specialties = { $in: [new RegExp(specialty, 'i')] };
    }
    
    if (experience) {
      filter.experienceYears = { $gte: parseInt(experience) };
    }

    // Build search query
    let searchFilter = {};
    if (search) {
      searchFilter = {
        $or: [
          { 'user.fullName': { $regex: search, $options: 'i' } },
          { specialties: { $in: [new RegExp(search, 'i')] } },
          { education: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const finalFilter = { ...filter, ...searchFilter };

    const therapists = await Therapist.find(finalFilter)
      .populate('user', 'fullName email profileImage')
      .sort({ rating: -1, experienceYears: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Therapist.countDocuments(finalFilter);

    res.json({
      success: true,
      count: therapists.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      therapists
    });
  } catch (error) {
    console.error('Get therapists error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get therapists'
    });
  }
});

// @desc    Get single therapist
// @route   GET /api/therapists/:id
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const therapist = await Therapist.findById(req.params.id)
      .populate('user', 'fullName email profileImage');

    if (!therapist) {
      return res.status(404).json({
        success: false,
        message: 'Therapist not found'
      });
    }

    res.json({
      success: true,
      therapist
    });
  } catch (error) {
    console.error('Get therapist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get therapist'
    });
  }
});

// @desc    Update therapist profile
// @route   PUT /api/therapists/profile
// @access  Private (Therapist only)
router.put('/profile', [
  authenticateToken,
  authorizeRoles('therapist'),
  body('specialties')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one specialty is required'),
  body('experienceYears')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('Experience years must be between 0 and 50'),
  body('education')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Education must be between 10 and 500 characters'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Bio cannot exceed 1000 characters'),
  body('hourlyRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Hourly rate must be a positive number'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { specialties, experienceYears, education, bio, hourlyRate, availability } = req.body;
    
    const updateData = {};
    if (specialties) updateData.specialties = specialties;
    if (experienceYears !== undefined) updateData.experienceYears = experienceYears;
    if (education) updateData.education = education;
    if (bio) updateData.bio = bio;
    if (hourlyRate !== undefined) updateData.hourlyRate = hourlyRate;
    if (availability) updateData.availability = availability;

    const therapist = await Therapist.findOneAndUpdate(
      { user: req.user._id },
      updateData,
      { new: true, runValidators: true }
    ).populate('user', 'fullName email profileImage');

    if (!therapist) {
      return res.status(404).json({
        success: false,
        message: 'Therapist profile not found'
      });
    }

    res.json({
      success: true,
      therapist
    });
  } catch (error) {
    console.error('Update therapist profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update therapist profile'
    });
  }
});

// @desc    Get therapist profile
// @route   GET /api/therapists/profile
// @access  Private (Therapist only)
router.get('/profile', authenticateToken, authorizeRoles('therapist'), async (req, res) => {
  try {
    const therapist = await Therapist.findOne({ user: req.user._id })
      .populate('user', 'fullName email profileImage mobile');

    if (!therapist) {
      return res.status(404).json({
        success: false,
        message: 'Therapist profile not found'
      });
    }

    res.json({
      success: true,
      therapist
    });
  } catch (error) {
    console.error('Get therapist profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get therapist profile'
    });
  }
});

// @desc    Get therapist statistics
// @route   GET /api/therapists/stats
// @access  Private (Therapist only)
router.get('/stats', authenticateToken, authorizeRoles('therapist'), async (req, res) => {
  try {
    const therapist = await Therapist.findOne({ user: req.user._id });
    
    if (!therapist) {
      return res.status(404).json({
        success: false,
        message: 'Therapist profile not found'
      });
    }

    const stats = {
      totalSessions: therapist.totalSessions,
      rating: therapist.rating,
      experienceYears: therapist.experienceYears,
      specialties: therapist.specialties,
      joinDate: therapist.createdAt
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get therapist stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get therapist statistics'
    });
  }
});

export default router;
