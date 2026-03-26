const express = require('express');
const router = express.Router();
const {
  createAppointment,
  getAppointments,
  getAppointmentById,
  searchByLocation,
  updateAppointment,
  deleteAppointment,
  bookSlot,
  cancelSlotBooking,
} = require('../controllers/appointmentController');
const { protect, authorize } = require('../middlewares/auth');

// Public routes
router.get('/', getAppointments);
router.get('/search/location', searchByLocation);
router.get('/:id', getAppointmentById);

// Protected routes
router.post('/', protect, authorize('doctor'), createAppointment);
router.put('/:id', protect, authorize('doctor'), updateAppointment);
router.delete('/:id', protect, authorize('doctor'), deleteAppointment);

// Slot booking routes
router.post('/:id/book-slot', protect, authorize('patient'), bookSlot);
router.post('/:id/cancel-slot', protect, authorize('patient'), cancelSlotBooking);

module.exports = router;
