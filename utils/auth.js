const jwt = require('jsonwebtoken');

// Generate JWT Token
exports.generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Verify JWT Token
exports.verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Generate slots based on start time, end time, and duration per patient
exports.generateSlots = (startTime, endTime, durationPerPatient) => {
  const slots = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  let currentMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  let slotCount = 0;

  while (currentMinutes < endMinutes) {
    const slotStart = Math.floor(currentMinutes / 60)
      .toString()
      .padStart(2, '0');
    const slotStartMin = (currentMinutes % 60).toString().padStart(2, '0');

    const slotEndMinutes = currentMinutes + durationPerPatient;
    const slotEnd = Math.floor(slotEndMinutes / 60)
      .toString()
      .padStart(2, '0');
    const slotEndMin = (slotEndMinutes % 60).toString().padStart(2, '0');

    slots.push({
      slotId: `slot-${slotCount}`,
      startTime: `${slotStart}:${slotStartMin}`,
      endTime: `${slotEnd}:${slotEndMin}`,
      isBooked: false,
      bookedBy: null,
      bookedAt: null,
    });

    currentMinutes += durationPerPatient;
    slotCount++;
  }

  return slots;
};
