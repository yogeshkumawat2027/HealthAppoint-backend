const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { generateSlots } = require('../utils/auth');

// @desc Create appointment (Doctor only)
// @route POST /api/appointments
// @access Private/Doctor
exports.createAppointment = async (req, res, next) => {
  try {
    const { title, specialization, location, address, date, startTime, endTime, durationPerPatient } =
      req.body;

    // Validation
    if (!title || !specialization || !location || !address || !date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    // Generate slots
    const slots = generateSlots(startTime, endTime, durationPerPatient || 15);

    // Create appointment
    const appointment = await Appointment.create({
      doctorId: req.user.id,
      title,
      specialization,
      location: {
        type: 'Point',
        coordinates: [location.longitude, location.latitude], // [lng, lat]
      },
      address,
      date: new Date(date),
      startTime,
      endTime,
      durationPerPatient: durationPerPatient || 15,
      slots,
    });

    // Add appointment to doctor's appointments array
    await User.findByIdAndUpdate(req.user.id, {
      $push: { appointments: appointment._id },
    });

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get all appointments
// @route GET /api/appointments
// @access Public
exports.getAppointments = async (req, res, next) => {
  try {
    const { specialization, page = 1, limit = 10 } = req.query;

    let filter = {};

    if (specialization) {
      filter.specialization = specialization;
    }

    const appointments = await Appointment.find(filter)
      .populate('doctorId', 'name email profileImage specialization')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Appointment.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: appointments.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: appointments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get appointment by ID
// @route GET /api/appointments/:id
// @access Public
exports.getAppointmentById = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id).populate(
      'doctorId',
      'name email profileImage specialization'
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    res.status(200).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Search appointments by location (Geospatial)
// @route GET /api/appointments/search/location
// @access Public
exports.searchByLocation = async (req, res, next) => {
  try {
    const { longitude, latitude, maxDistance = 10000, specialization, page = 1, limit = 10 } = req.query;

    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: 'Please provide longitude and latitude',
      });
    }

    let filter = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          $maxDistance: parseFloat(maxDistance),
        },
      },
    };

    if (specialization) {
      filter.specialization = specialization;
    }

    const appointments = await Appointment.find(filter)
      .populate('doctorId', 'name email profileImage specialization')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Appointment.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: appointments.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: appointments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Update appointment (Doctor only)
// @route PUT /api/appointments/:id
// @access Private/Doctor
exports.updateAppointment = async (req, res, next) => {
  try {
    let appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    // Check if user is the doctor who created this appointment
    if (appointment.doctorId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this appointment',
      });
    }

    const { title, specialization, location, address, date, startTime, endTime, durationPerPatient } =
      req.body;

    // Update basic fields
    if (title) appointment.title = title;
    if (specialization) appointment.specialization = specialization;
    if (location) {
      appointment.location = {
        type: 'Point',
        coordinates: [location.longitude, location.latitude],
      };
    }
    if (address) appointment.address = address;
    if (date) appointment.date = new Date(date);

    // Regenerate slots if time or duration changed
    if (startTime || endTime || durationPerPatient) {
      const newStartTime = startTime || appointment.startTime;
      const newEndTime = endTime || appointment.endTime;
      const newDuration = durationPerPatient || appointment.durationPerPatient;

      appointment.slots = generateSlots(newStartTime, newEndTime, newDuration);
      appointment.startTime = newStartTime;
      appointment.endTime = newEndTime;
      appointment.durationPerPatient = newDuration;
    }

    appointment = await appointment.save();

    res.status(200).json({
      success: true,
      message: 'Appointment updated successfully',
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Delete appointment (Doctor only)
// @route DELETE /api/appointments/:id
// @access Private/Doctor
exports.deleteAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    // Check if user is the doctor
    if (appointment.doctorId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this appointment',
      });
    }

    // Remove appointment from doctor's appointments array
    await User.findByIdAndUpdate(appointment.doctorId, {
      $pull: { appointments: appointment._id },
    });

    await Appointment.deleteOne({ _id: req.params.id });

    res.status(200).json({
      success: true,
      message: 'Appointment deleted successfully',
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc Book a slot (Patient only)
// @route POST /api/appointments/:id/book-slot
// @access Private/Patient
exports.bookSlot = async (req, res, next) => {
  try {
    const { slotId } = req.body;

    if (!slotId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide slot ID',
      });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    // Find the slot
    const slot = appointment.slots.find((s) => s.slotId === slotId);

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found',
      });
    }

    if (slot.isBooked) {
      return res.status(400).json({
        success: false,
        message: 'Slot is already booked',
      });
    }

    // Book the slot
    slot.isBooked = true;
    slot.bookedBy = req.user.id;
    slot.bookedAt = new Date();

    // Add patient to bookedSlots array
    appointment.bookedSlots.push(req.user.id);

    // Add appointment to patient's bookedAppointments
    await User.findByIdAndUpdate(req.user.id, {
      $push: { bookedAppointments: appointment._id },
    });

    await appointment.save();

    // Emit socket.io event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit(`appointment-${req.params.id}`, {
        action: 'slot-booked',
        slot,
        appointment,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Slot booked successfully',
      data: {
        slot,
        appointment,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Cancel slot booking (Patient only)
// @route POST /api/appointments/:id/cancel-slot
// @access Private/Patient
exports.cancelSlotBooking = async (req, res, next) => {
  try {
    const { slotId } = req.body;

    if (!slotId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide slot ID',
      });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    const slot = appointment.slots.find((s) => s.slotId === slotId);

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found',
      });
    }

    if (!slot.isBooked || slot.bookedBy.toString() !== req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot cancel this slot',
      });
    }

    // Cancel the booking
    slot.isBooked = false;
    slot.bookedBy = null;
    slot.bookedAt = null;

    // Remove patient from bookedSlots
    appointment.bookedSlots = appointment.bookedSlots.filter((id) => id.toString() !== req.user.id);

    // Remove appointment from patient's bookedAppointments
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { bookedAppointments: appointment._id },
    });

    await appointment.save();

    // Emit socket.io event
    const io = req.app.get('io');
    if (io) {
      io.emit(`appointment-${req.params.id}`, {
        action: 'slot-cancelled',
        slot,
        appointment,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Slot booking cancelled',
      data: {
        slot,
        appointment,
      },
    });
  } catch (error) {
    next(error);
  }
};
