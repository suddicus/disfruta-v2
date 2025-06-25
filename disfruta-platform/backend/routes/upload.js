const express = require('express');
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads');
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only images and documents are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files
  },
  fileFilter: fileFilter
});

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'error',
        message: 'File too large. Maximum size is 10MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        status: 'error',
        message: 'Too many files. Maximum is 5 files.'
      });
    }
  }
  
  if (error.message === 'Only images and documents are allowed') {
    return res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
  
  next(error);
};

// Single file upload endpoint
router.post('/single', protect, upload.single('file'), handleMulterError, (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded'
      });
    }

    res.json({
      status: 'success',
      message: 'File uploaded successfully',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: `/uploads/${req.file.filename}`
      }
    });
  } catch (error) {
    console.error('Single file upload error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error uploading file'
    });
  }
});

// Multiple files upload endpoint
router.post('/multiple', protect, upload.array('files', 5), handleMulterError, (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No files uploaded'
      });
    }

    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      path: `/uploads/${file.filename}`
    }));

    res.json({
      status: 'success',
      message: `${req.files.length} files uploaded successfully`,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Multiple files upload error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error uploading files'
    });
  }
});

// Profile picture upload endpoint
router.post('/profile-picture', protect, upload.single('profilePicture'), handleMulterError, (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No profile picture uploaded'
      });
    }

    // Check if file is an image
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        status: 'error',
        message: 'Profile picture must be an image file'
      });
    }

    res.json({
      status: 'success',
      message: 'Profile picture uploaded successfully',
      profilePicture: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        path: `/uploads/${req.file.filename}`
      }
    });
  } catch (error) {
    console.error('Profile picture upload error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error uploading profile picture'
    });
  }
});

// KYC documents upload endpoint
router.post('/kyc-documents', protect, upload.array('documents', 5), handleMulterError, (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No KYC documents uploaded'
      });
    }

    const { documentType } = req.body;
    const validDocumentTypes = ['id', 'passport', 'license', 'utility_bill', 'bank_statement'];
    
    if (!documentType || !validDocumentTypes.includes(documentType)) {
      return res.status(400).json({
        status: 'error',
        message: 'Valid document type is required'
      });
    }

    const uploadedDocuments = req.files.map(file => ({
      type: documentType,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      path: `/uploads/${file.filename}`,
      uploadedAt: new Date(),
      status: 'pending'
    }));

    res.json({
      status: 'success',
      message: `${req.files.length} KYC documents uploaded successfully`,
      documents: uploadedDocuments
    });
  } catch (error) {
    console.error('KYC documents upload error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error uploading KYC documents'
    });
  }
});

module.exports = router;