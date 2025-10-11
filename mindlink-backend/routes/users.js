import express from 'express';
import User from '../models/User.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { body } from 'express-validator';

const router = express.Router();

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', [
  authenticateToken,
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('mobile')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid mobile number'),
  body('profileImage')
    .optional()
    .custom((value) => {
      // Allow either a normal URL or a base64 data URL
      const isDataUrl = typeof value === 'string' && value.startsWith('data:image/');
      const isHttpUrl = typeof value === 'string' && /^https?:\/\//i.test(value);
      if (!isDataUrl && !isHttpUrl) {
        throw new Error('Profile image must be a valid URL or data URL');
      }
      return true;
    }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { fullName, mobile, profileImage } = req.body;
    
    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (mobile) updateData.mobile = mobile;
    if (profileImage) updateData.profileImage = profileImage;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// @desc    Deactivate user account
// @route   DELETE /api/users/profile
// @access  Private
router.delete('/profile', authenticateToken, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { isActive: false });
    
    res.json({
      success: true,
      message: 'Account deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate account'
    });
  }
});

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private (User only)
router.get('/stats', authenticateToken, authorizeRoles('user'), async (req, res) => {
  try {
    // This would typically include stats like:
    // - Total sessions attended
    // - Total time in support rooms
    // - Number of therapists consulted
    // - etc.
    
    const stats = {
      totalSessions: 0,
      totalTimeMinutes: 0,
      therapistsConsulted: 0,
      joinDate: req.user.createdAt
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user statistics'
    });
  }
});

export default router;
