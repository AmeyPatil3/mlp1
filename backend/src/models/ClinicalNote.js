import mongoose from 'mongoose';

const clinicalNoteSchema = new mongoose.Schema({
  // The client this note is about
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // The therapist who wrote the note
  therapist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Therapist',
    required: true
  },
  // Optional link to a real appointment (e.g. notes saved during/after a live call)
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    default: null
  },
  // Date of the session this note refers to (can be past or present)
  sessionDate: {
    type: Date,
    required: [true, 'Session date is required']
  },
  // SOAP structured note stored as compiled markdown
  notes: {
    type: String,
    maxlength: [20000, 'Notes cannot exceed 20000 characters'],
    default: ''
  },
  // Optional label/title for quick identification
  title: {
    type: String,
    maxlength: [200, 'Title cannot exceed 200 characters'],
    default: ''
  },
  // Saved signature at the time of session note creation/update
  digitalSignature: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// Auto-populate client info on reads
clinicalNoteSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'client',
    select: 'fullName email profileImage'
  });
  next();
});

clinicalNoteSchema.index({ therapist: 1, client: 1, sessionDate: -1 });

export default mongoose.model('ClinicalNote', clinicalNoteSchema);
