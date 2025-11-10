import express from 'express';
import Appointment from '../models/Appointment.js';
import Therapist from '../models/Therapist.js';
import User from '../models/User.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { validateAppointment } from '../middleware/validation.js';
import { sendMail, buildIcs } from '../utils/mailer.js';
import Room from '../models/Room.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Simple HTML escaper for safe email content
function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

    // Create private room for this session
    const roomUniqueId = uuidv4();
    const therapistUser = await User.findById(therapist.user).select('_id fullName');
    const privateRoom = await Room.create({
      roomId: roomUniqueId,
      name: 'Private Therapy Session',
      topic: 'One-on-one therapy',
      description: `Private session for ${req.user.fullName} and ${therapistUser?.fullName || 'therapist'}`,
      createdBy: req.user._id,
      participants: [
        { user: req.user._id, isActive: true },
        { user: therapist.user, isActive: true }
      ],
      maxParticipants: 2,
      isPrivate: true
    });

    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
    const meetingPath = `#/app/member/room/${privateRoom._id}`;

    const appointment = await Appointment.create({
      user: req.user._id,
      therapist: therapistId,
      scheduledDate,
      duration: duration || 60,
      type: type || 'video',
      notes,
      price: therapist.hourlyRate ? (therapist.hourlyRate * (duration || 60) / 60) : 0,
      meetingLink: `${frontendBase}/${meetingPath}`,
      meetingRoomId: privateRoom._id.toString()
    });

    // Fire-and-forget booking emails (user and therapist)
    try {
      const start = new Date(scheduledDate);
      const end = new Date(start.getTime() + (appointment.duration || 60) * 60000);
      const ics = buildIcs({
        title: 'Therapy Session',
        description: `Therapy session with ${req.user.fullName || 'member'}${notes ? `\n\nNotes: ${notes}` : ''}`,
        start,
        end
      });
      const userEmail = req.user.email;
      const therapistUser = await User.findById(therapist.user).select('email fullName'); // populate therapist user email
      const therapistEmail = therapistUser?.email;
      const when = start.toLocaleString();
      const durationMins = appointment.duration || 60;
      if (userEmail) {
        sendMail({
          to: userEmail,
          subject: 'Your therapy booking is scheduled',
          html: `<p>Hi ${req.user.fullName || 'there'},</p>
                 <p>Your therapy session is scheduled for <b>${when}</b> (${durationMins} mins) with <b>${therapistUser?.fullName || 'therapist'}</b>.</p>
                 <p>Join link (at the appointment time): <a href="${escapeHtml(appointment.meetingLink)}">${escapeHtml(appointment.meetingLink)}</a></p>
                 ${notes ? `<p><i>Your note:</i> ${escapeHtml(notes)}</p>` : ''}
                 <p>You will receive updates if anything changes.</p>`,
          ics
        }).catch(() => {});
      }
      if (therapistEmail) {
        const therapistLink = appointment.meetingLink.replace('/app/member/room/', '/app/therapist/room/');
        sendMail({
          to: therapistEmail,
          subject: 'New therapy booking request',
          html: `<p>Hi ${therapistUser?.fullName || 'Therapist'},</p>
                 <p>You have a new booking for <b>${when}</b> (${durationMins} mins) from <b>${req.user.fullName || req.user.email}</b>.</p>
                 <p>Join link (at the appointment time): <a href="${escapeHtml(therapistLink)}">${escapeHtml(therapistLink)}</a></p>
                 ${notes ? `<p><i>User note:</i> ${escapeHtml(notes)}</p>` : ''}
                 <p>Please confirm or update details as needed.</p>`,
          ics
        }).catch(() => {});
      }
    } catch (e) {
      console.error('Booking email error:', e.message);
    }

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

    // Notify on key status changes
    try {
      if (status === 'confirmed' || status === 'cancelled') {
        const start = new Date(appointment.scheduledDate);
        const end = new Date(start.getTime() + (appointment.duration || 60) * 60000);
        const ics = buildIcs({
          title: 'Therapy Session',
          description: `Therapy session ${status}`,
          start,
          end,
          url: meetingLink
        });
        // Fetch related emails
        const user = await User.findById(appointment.user).select('email fullName');
        const therapist = await Therapist.findById(appointment.therapist).populate('user', 'email fullName');
        const userEmail = user?.email;
        const therapistEmail = therapist?.user?.email;
        const when = start.toLocaleString();
        const durationMins = appointment.duration || 60;
        const therapistLink = meetingLink ? meetingLink.replace('/app/member/room/', '/app/therapist/room/') : null;
        const parts = meetingLink ? `<p>Meeting link: <a href="${escapeHtml(meetingLink)}">${escapeHtml(meetingLink)}</a></p>` : '';
        const statusText = status === 'confirmed' ? 'confirmed' : 'cancelled';
        if (userEmail) {
          sendMail({
            to: userEmail,
            subject: `Your therapy booking is ${statusText}`,
            html: `<p>Hi ${user?.fullName || 'there'},</p>
                   <p>Your session for <b>${when}</b> (${durationMins} mins) with <b>${therapist?.user?.fullName || 'therapist'}</b> has been <b>${statusText}</b>.</p>
                   ${parts}`,
            ics
          }).catch(() => {});
        }
        if (therapistEmail) {
          sendMail({
            to: therapistEmail,
            subject: `Booking ${statusText}`,
            html: `<p>Hi ${therapist?.user?.fullName || 'Therapist'},</p>
                   <p>The session for <b>${when}</b> (${durationMins} mins) with <b>${user?.fullName || userEmail}</b> is now <b>${statusText}</b>.</p>
                   ${therapistLink ? `<p>Meeting link: <a href="${escapeHtml(therapistLink)}">${escapeHtml(therapistLink)}</a></p>` : ''}`,
            ics
          }).catch(() => {});
        }
      }
    } catch (e) {
      console.error('Update email error:', e.message);
    }

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
    // Determine therapist id if requester is a therapist
    let requesterTherapistId = null;
    if (req.user.role === 'therapist') {
      const t = await Therapist.findOne({ user: req.user._id }).select('_id');
      requesterTherapistId = t?._id || null;
    }

    // Fetch appointment ensuring ownership (user or therapist)
    const ownershipFilter = [
      { user: req.user._id }
    ];
    if (requesterTherapistId) {
      ownershipFilter.push({ therapist: requesterTherapistId });
    }
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      $or: ownershipFilter
    });

    if (!appointment) {
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

    // Notify both parties about cancellation
    try {
      const start = new Date(appointment.scheduledDate);
      const end = new Date(start.getTime() + (appointment.duration || 60) * 60000);
      const ics = buildIcs({
        title: 'Therapy Session',
        description: 'Therapy session cancelled',
        start,
        end
      });
      const user = await User.findById(appointment.user).select('email fullName');
      const therapist = await Therapist.findById(appointment.therapist).populate('user', 'email fullName');
      const userEmail = user?.email;
      const therapistEmail = therapist?.user?.email;
      const when = start.toLocaleString();
      const durationMins = appointment.duration || 60;
      if (userEmail) {
        sendMail({
          to: userEmail,
          subject: 'Your therapy booking is cancelled',
          html: `<p>Hi ${user?.fullName || 'there'},</p>
                 <p>Your session for <b>${when}</b> (${durationMins} mins) with <b>${therapist?.user?.fullName || 'therapist'}</b> has been <b>cancelled</b>.</p>`,
          ics
        }).catch(() => {});
      }
      if (therapistEmail) {
        sendMail({
          to: therapistEmail,
          subject: 'Booking cancelled',
          html: `<p>Hi ${therapist?.user?.fullName || 'Therapist'},</p>
                 <p>The session for <b>${when}</b> (${durationMins} mins) with <b>${user?.fullName || userEmail}</b> has been <b>cancelled</b>.</p>`,
          ics
        }).catch(() => {});
      }
    } catch (e) {
      console.error('Cancel email error:', e?.message || e);
    }

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
