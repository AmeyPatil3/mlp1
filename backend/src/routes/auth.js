import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Therapist from '../models/Therapist.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateUserRegistration, validateTherapistRegistration, validateLogin } from '../middleware/validation.js';

const router = express.Router();

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
};

// @desc    Register user
// @route   POST /api/auth/register/user
// @access  Public
router.post('/register/user', validateUserRegistration, async (req, res) => {
  try {
    const { fullName, email, password, mobile, profileImage } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    // Create user
    const user = await User.create({
      fullName,
      email,
      password,
      mobile,
      profileImage: profileImage || 'https://i.pravatar.cc/150',
      role: 'user'
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      ...user.toJSON()
    });
  } catch (error) {
    console.error('User registration error:', error);
    
    // Handle specific validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
});

// @desc    Register therapist
// @route   POST /api/auth/register/therapist
// @access  Public
router.post('/register/therapist', validateTherapistRegistration, async (req, res) => {
  try {
    const { fullName, email, password, specialties, experienceYears, education, profileImage } = req.body;

    // Normalize inputs
    const normalizedSpecialties = Array.isArray(specialties)
      ? specialties
      : typeof specialties === 'string'
        ? specialties.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
    const normalizedExperienceYears = typeof experienceYears === 'number'
      ? experienceYears
      : Number(experienceYears);

    // Fail fast if JWT secret missing (token generation would fail later)
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Server misconfiguration: JWT secret not set'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    // Create user first
    let user;
    try {
      user = await User.create({
        fullName,
        email,
        password,
        mobile: '000-000-0000', // Default for therapists
        profileImage: profileImage || 'https://i.pravatar.cc/150',
        role: 'therapist'
      });
    } catch (createUserError) {
      // Duplicate key error or validation
      if (createUserError?.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email already exists'
        });
      }
      if (createUserError.name === 'ValidationError') {
        const errors = Object.values(createUserError.errors).map((err) => err.message);
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors
        });
      }
      console.error('User creation error:', createUserError);
      return res.status(500).json({
        success: false,
        message: 'Registration failed while creating user. Please try again.',
        ...(process.env.NODE_ENV !== 'production' && { detail: createUserError.message })
      });
    }

    try {
      // Create therapist profile
      const therapist = await Therapist.create({
        user: user._id,
        specialties: normalizedSpecialties,
        experienceYears: normalizedExperienceYears,
        education
      });

      const token = generateToken(user._id);

      return res.status(201).json({
        success: true,
        token,
        ...user.toJSON(),
        therapistProfile: therapist
      });
    } catch (profileError) {
      // Roll back user if therapist profile creation fails
      await User.findByIdAndDelete(user._id).catch(() => {});

      // Bubble validation details if present
      if (profileError.name === 'ValidationError') {
        const errors = Object.values(profileError.errors).map((err) => err.message);
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors
        });
      }

      // Handle cast errors (e.g., non-numeric experienceYears)
      if (profileError.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid data type provided',
          errors: [profileError.message]
        });
      }

      console.error('Therapist profile creation error:', profileError);
      return res.status(500).json({
        success: false,
        message: 'Registration failed while creating therapist profile. Please try again.',
        ...(process.env.NODE_ENV !== 'production' && { detail: profileError.message })
      });
    }
  } catch (error) {
    console.error('Therapist registration error:', error);
    
    // Handle specific validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Find user by email and role
    const user = await User.findOne({ email, role }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      ...user.toJSON()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', authenticateToken, async (req, res) => {
  try {
    let userData = req.user.toJSON();

    // If user is a therapist, include therapist profile
    if (req.user.role === 'therapist') {
      const therapistProfile = await Therapist.findOne({ user: req.user._id });
      userData.therapistProfile = therapistProfile;
    }

    res.json({
      success: true,
      user: userData
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user data'
    });
  }
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
});

export default router;
