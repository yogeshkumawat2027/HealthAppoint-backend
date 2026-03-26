const express = require('express');
const router = express.Router();
const multer = require('multer');
const { getUserProfile, updateUserProfile, getAllDoctors } = require('../controllers/userController');
const { protect } = require('../middlewares/auth');

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5000000 }, // 5MB
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Routes
router.get('/:id', getUserProfile);
router.put('/:id', protect, upload.single('profileImage'), updateUserProfile);
router.get('/doctors/all', getAllDoctors);

module.exports = router;
