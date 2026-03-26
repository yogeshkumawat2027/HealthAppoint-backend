const User = require('../models/User');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// @desc Get user profile
// @route GET /api/users/:id
// @access Public
exports.getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate('appointments bookedAppointments');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Update user profile
// @route PUT /api/users/:id
// @access Private
exports.updateUserProfile = async (req, res, next) => {
  try {
    const { name, specialization } = req.body;
    let updateData = { name };

    // Add specialization if user is a doctor
    if (specialization) {
      updateData.specialization = specialization;
    }

    // Handle profile image upload to Cloudinary
    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'health-appointment/profiles',
          resource_type: 'auto',
        });

        updateData.profileImage = result.secure_url;

        // Delete temp file (multer)
        const fs = require('fs');
        fs.unlinkSync(req.file.path);
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return res.status(400).json({
          success: false,
          message: 'Failed to upload image',
        });
      }
    }

    // Update user
    const user = await User.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get all doctors (for patient search)
// @route GET /api/users/doctors/all
// @access Public
exports.getAllDoctors = async (req, res, next) => {
  try {
    const { specialization, page = 1, limit = 10 } = req.query;

    let filter = { role: 'doctor' };

    if (specialization) {
      filter.specialization = specialization;
    }

    const doctors = await User.find(filter)
      .select('name email profileImage specialization appointments')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: doctors.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: doctors,
    });
  } catch (error) {
    next(error);
  }
};
