const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide appointment title'],
    },
    specialization: {
      type: String,
      enum: ['Cardiology', 'Dermatology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Psychiatry', 'General'],
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    address: {
      type: String,
      required: [true, 'Please provide appointment address'],
    },
    date: {
      type: Date,
      required: [true, 'Please provide appointment date'],
    },
    startTime: {
      type: String, // HH:mm format
      required: [true, 'Please provide start time'],
    },
    endTime: {
      type: String, // HH:mm format
      required: [true, 'Please provide end time'],
    },
    durationPerPatient: {
      type: Number, // in minutes (e.g., 5, 15, 30)
      required: [true, 'Please provide duration per patient'],
      default: 15,
    },
    slots: [
      {
        slotId: String,
        startTime: String, // HH:mm
        endTime: String, // HH:mm
        isBooked: {
          type: Boolean,
          default: false,
        },
        bookedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          default: null,
        },
        bookedAt: Date,
      },
    ],
    bookedSlots: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { timestamps: true }
);

// Index for geospatial queries
appointmentSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Appointment', appointmentSchema);
