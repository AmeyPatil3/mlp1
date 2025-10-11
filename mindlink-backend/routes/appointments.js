import express from 'express';
import Appointment from '../models/Appointment.js';
import Therapist from '../models/Therapist.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateAppointment } from '../middleware/validation.js';

const router = express.Router();

// @desc    Get user's appointments
// @route   GET /api/appointments
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    let filter = {};
    
    if (req.user.role === 'user') {
      filter.user = req.user._id;
    } else if (req.user.role === 'therapist') {
      const therapist = await Therapist.findOne({ user: req.user._id });
      if (!therapist) {
        return res.status(404).json({
          success: false,
          message: 'Therapist profile not found'
        });
      }
      filter.therapist = therapist._id;
    }
    
    if (status) {
      filter.status = status;
    }

    const appointments = await Appointment.find(filter)
      .sort({ scheduledDate: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Appointment.countDocuments(filter);

    res.json({
      success: true,
      count: appointments.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      appointments
    });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get appointments'
    });
  }
});

// @desc    Get single appointment
// @route   GET /api/appointments/:id
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check if user has access to this appointment
    let hasAccess = appointment.user.toString() === req.user._id.toString();
    if (!hasAccess && req.user.role === 'therapist') {
      const therapist = await Therapist.findOne({ user: req.user._id });
      if (therapist) {
        hasAccess = appointment.therapist.toString() === therapist._id.toString();
      }
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      appointment
    });
  } catch (error) {
    console.error('Get appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get appointment'
    });
  }
});

// @desc    Create new appointment
// @route   POST /api/appointments
// @access  Private (User only)
router.post('/', authenticateToken, authorizeRoles('user'), validateAppointment, async (req, res) => {
  try {
    const { therapistId, scheduledDate, duration, type, notes } = req.body;

    // Check if therapist exists
    const therapist = await Therapist.findById(therapistId);
    if (!therapist) {
      return res.status(404).json({
        success: false,
        message: 'Therapist not found'
      });
    }

    // Check for conflicting appointments
    const conflictingAppointment = await Appointment.findOne({
      therapist: therapistId,
      scheduledDate: {
        $gte: new Date(scheduledDate),
        $lt: new Date(new Date(scheduledDate).getTime() + (duration || 60) * 60000)
      },
      status: { $in: ['scheduled', 'confirmed'] }
    });

    if (conflictingAppointment) {
      return res.status(400).json({
        success: false,
        message: 'Therapist is not available at this time'
      });
    }

    const appointment = await Appointment.create({
      user: req.user._id,
      therapist: therapistId,
      scheduledDate,
      duration: duration || 60,
      type: type || 'video',
      notes,
      price: therapist.hourlyRate ? (therapist.hourlyRate * (duration || 60) / 60) : 0
    });

    res.status(201).json({
      success: true,
      appointment
    });
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create appointment'
    });
  }
});

// @desc    Update appointment
// @route   PUT /api/appointments/:id
// @access  Private
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { status, notes, meetingLink } = req.body;
    
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check if user has access to this appointment
    let hasAccess = appointment.user.toString() === req.user._id.toString();
    if (!hasAccess && req.user.role === 'therapist') {
      const therapist = await Therapist.findOne({ user: req.user._id });
      if (therapist) {
        hasAccess = appointment.therapist.toString() === therapist._id.toString();
      }
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (meetingLink) updateData.meetingLink = meetingLink;

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      appointment: updatedAppointment
    });
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update appointment'
    });
  }
});

// @desc    Cancel appointment
// @route   DELETE /api/appointments/:id
// @access  Private
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check if user has access to this appointment
    console.log('DELETE appointment - User ID:', req.user._id);
    console.log('DELETE appointment - User role:', req.user.role);
    console.log('DELETE appointment - Appointment user ID:', appointment.user);
    console.log('DELETE appointment - Appointment therapist ID:', appointment.therapist);
    
    let hasAccess = appointment.user.toString() === req.user._id.toString();
    
    // If user is a therapist, check if they're the therapist for this appointment
    if (!hasAccess && req.user.role === 'therapist') {
      const therapist = await Therapist.findOne({ user: req.user._id });
      if (therapist) {
        hasAccess = appointment.therapist.toString() === therapist._id.toString();
        console.log('Therapist access check:', hasAccess);
      }
    }

    console.log('Has access:', hasAccess);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - You can only cancel your own appointments'
      });
    }

    // Check if appointment can be cancelled
    if (['completed', 'cancelled'].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: 'Appointment cannot be cancelled'
      });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    res.json({
      success: true,
      message: 'Appointment cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel appointment'
    });
  }
});

// @desc    Get therapist availability
// @route   GET /api/appointments/availability/:therapistId
// @access  Private
router.get('/availability/:therapistId', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }

    const therapist = await Therapist.findById(req.params.therapistId);
    if (!therapist) {
      return res.status(404).json({
        success: false,
        message: 'Therapist not found'
      });
    }

    // Get existing appointments for the date
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const appointments = await Appointment.find({
      therapist: req.params.therapistId,
      scheduledDate: {
        $gte: startDate,
        $lt: endDate
      },
      status: { $in: ['scheduled', 'confirmed'] }
    });

    // Generate available time slots (simplified)
    const availableSlots = [];
    const startHour = 9;
    const endHour = 17;
    
    for (let hour = startHour; hour < endHour; hour++) {
      const slotTime = new Date(startDate);
      slotTime.setHours(hour, 0, 0, 0);
      
      const isBooked = appointments.some(apt => {
        const aptTime = new Date(apt.scheduledDate);
        return aptTime.getHours() === hour;
      });
      
      if (!isBooked) {
        availableSlots.push({
          time: slotTime.toISOString(),
          displayTime: slotTime.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          })
        });
      }
    }

    res.json({
      success: true,
      availableSlots
    });
  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get availability'
    });
  }
});

export default router;
