const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const { questionImageUpload } = require("../config/multer");
const { authenticateToken } = require("../middleware/employeeAuth");

/**
 * Upload question image
 * POST /api/upload/question-image
 * Requires authentication
 */
router.post(
  "/question-image",
  authenticateToken,
  questionImageUpload.single("image"),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No image file provided",
        });
      }

      // Generate the URL path for the uploaded file
      const imageUrl = `/uploads/questions/${req.file.filename}`;

      res.json({
        success: true,
        message: "Image uploaded successfully",
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          url: imageUrl,
        },
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload image",
        error: error.message,
      });
    }
  }
);

/**
 * Delete question image
 * DELETE /api/upload/question-image/:filename
 * Requires authentication
 */
router.delete("/question-image/:filename", authenticateToken, (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, "../uploads/questions", filename);

    // Security check - prevent path traversal
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return res.status(400).json({
        success: false,
        message: "Invalid filename",
      });
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({
        success: true,
        message: "Image deleted successfully",
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Image not found",
      });
    }
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete image",
      error: error.message,
    });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof require("multer").MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File size too large. Maximum size is 5MB.",
      });
    }
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  next();
});

module.exports = router;
