import express from 'express';
import ClinicalNote from '../models/ClinicalNote.js';
import Therapist from '../models/Therapist.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// ─── GET /api/clinical-notes ─────────────────────────────────────────────────
// Returns all clinical notes written by the authenticated therapist,
// grouped by client. Query param ?clientId= to filter to one client.
router.get('/', authenticateToken, authorizeRoles('therapist'), async (req, res) => {
  try {
    const therapist = await Therapist.findOne({ user: req.user._id });
    if (!therapist) {
      return res.status(404).json({ success: false, message: 'Therapist profile not found' });
    }

    const filter = { therapist: therapist._id };
    if (req.query.clientId) {
      filter.client = req.query.clientId;
    }

    const notes = await ClinicalNote.find(filter).sort({ sessionDate: -1 });
    res.json({ success: true, notes });
  } catch (err) {
    console.error('GET clinical-notes error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch clinical notes' });
  }
});

// ─── POST /api/clinical-notes ─────────────────────────────────────────────────
// Create a new clinical note for a client.
router.post('/', authenticateToken, authorizeRoles('therapist'), async (req, res) => {
  try {
    const { clientId, sessionDate, notes, title, appointmentId } = req.body;

    if (!clientId || !sessionDate) {
      return res.status(400).json({ success: false, message: 'clientId and sessionDate are required' });
    }

    const therapist = await Therapist.findOne({ user: req.user._id });
    if (!therapist) {
      return res.status(404).json({ success: false, message: 'Therapist profile not found' });
    }

    const note = await ClinicalNote.create({
      client: clientId,
      therapist: therapist._id,
      sessionDate: new Date(sessionDate),
      notes: notes || '',
      title: title || '',
      appointment: appointmentId || null,
      digitalSignature: therapist.digitalSignature || ''
    });

    // Re-fetch with population
    const populated = await ClinicalNote.findById(note._id);
    res.status(201).json({ success: true, note: populated });
  } catch (err) {
    console.error('POST clinical-notes error:', err);
    res.status(500).json({ success: false, message: 'Failed to create clinical note' });
  }
});

// ─── PUT /api/clinical-notes/:id ─────────────────────────────────────────────
// Update a clinical note (therapist who created it only).
router.put('/:id', authenticateToken, authorizeRoles('therapist'), async (req, res) => {
  try {
    const therapist = await Therapist.findOne({ user: req.user._id });
    if (!therapist) {
      return res.status(404).json({ success: false, message: 'Therapist profile not found' });
    }

    const note = await ClinicalNote.findOne({ _id: req.params.id, therapist: therapist._id });
    if (!note) {
      return res.status(404).json({ success: false, message: 'Clinical note not found or access denied' });
    }

    const { notes, title, sessionDate } = req.body;
    if (notes !== undefined) note.notes = notes;
    if (title !== undefined) note.title = title;
    if (sessionDate !== undefined) note.sessionDate = new Date(sessionDate);
    // Auto-update signature on edit
    note.digitalSignature = therapist.digitalSignature || '';

    await note.save();
    const populated = await ClinicalNote.findById(note._id);
    res.json({ success: true, note: populated });
  } catch (err) {
    console.error('PUT clinical-notes error:', err);
    res.status(500).json({ success: false, message: 'Failed to update clinical note' });
  }
});

// ─── DELETE /api/clinical-notes/:id ──────────────────────────────────────────
router.delete('/:id', authenticateToken, authorizeRoles('therapist'), async (req, res) => {
  try {
    const therapist = await Therapist.findOne({ user: req.user._id });
    if (!therapist) {
      return res.status(404).json({ success: false, message: 'Therapist profile not found' });
    }

    const note = await ClinicalNote.findOneAndDelete({ _id: req.params.id, therapist: therapist._id });
    if (!note) {
      return res.status(404).json({ success: false, message: 'Clinical note not found or access denied' });
    }

    res.json({ success: true, message: 'Clinical note deleted' });
  } catch (err) {
    console.error('DELETE clinical-notes error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete clinical note' });
  }
});

export default router;
