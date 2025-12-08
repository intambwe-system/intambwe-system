// middleware/studentAuth.js
const jwt = require('jsonwebtoken');
const { Student } = require('../model');

// Verify JWT token and attach student to request
// Middleware to verify access token and automatically refresh if expired
const authenticateStudent = (req, res, next) => {
    const accessToken = req.cookies?.StudentAccessToken;
   
    if (!accessToken) {
        return res.status(403).json({ 
            success: false,
            message: 'Access token not found' 
        });
    }
   
    jwt.verify(accessToken, process.env.JWT_SECRET || 'your-secret-key', async (err, decoded) => {
        // If token is valid, proceed normally
        if (!err) {
            try {
                const student = await Student.findByPk(decoded.std_id);
                
                if (!student) {
                    return res.status(404).json({ 
                        success: false,
                        message: 'Student not found' 
                    });
                }
                
                // Attach student to request
                req.student = {
                    std_id: student.std_id,
                    std_fname: student.std_fname,
                    std_lname: student.std_lname,
                    std_email: student.std_email,
                    std_grade: student.std_grade,
                    class_id: student.class_id,
                    parent_id: student.parent_id,
                    dpt_id: student.dpt_id
                };
                
                return next();
            } catch (error) {
                console.error('Error during authentication');
                return res.status(500).json({ 
                    success: false,
                    message: 'Server error during authentication' 
                });
            }
        }
       
        // If token is expired, try to use refresh token
        if (err.name === 'TokenExpiredError') {
            const refreshToken = req.cookies?.StudentRefreshToken;
           
            if (!refreshToken) {
                return res.status(401).json({ 
                    success: false,
                    message: 'Refresh token not found, please login again' 
                });
            }
           
            // Verify refresh token
            jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret', async (refreshErr, refreshDecoded) => {
                if (refreshErr) {
                    return res.status(403).json({ 
                        success: false,
                        message: 'Invalid refresh token, please login again' 
                    });
                }
               
                try {
                    // Find student from refresh token
                    const student = await Student.findByPk(refreshDecoded.std_id);
                   
                    if (!student) {
                        return res.status(404).json({ 
                            success: false,
                            message: 'Student not found' 
                        });
                    }
                   
                    // Generate new tokens
                    const newAccessToken = await generateStudentAccessToken(student);
                    const newRefreshToken = await generateStudentRefreshToken(student);
                   
                    // Set new cookies with improved settings
                    res.cookie('StudentAccessToken', newAccessToken, {
                        httpOnly: true,
                        sameSite: 'strict',
                        secure: true,
                        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
                    });
                   
                    res.cookie('StudentRefreshToken', newRefreshToken, {
                        httpOnly: true,
                        sameSite: 'strict',
                        secure: true,
                        maxAge: 1000 * 60 * 60 * 24 * 30 // 30 days
                    });
                   
                    // Attach student to request
                    req.student = {
                        std_id: student.std_id,
                        std_fname: student.std_fname,
                        std_lname: student.std_lname,
                        std_email: student.std_email,
                        std_grade: student.std_grade,
                        class_id: student.class_id,
                        parent_id: student.parent_id,
                        dpt_id: student.dpt_id
                    };
                    
                    next();
                } catch (error) {
                    console.error('Error during token refresh');
                    return res.status(500).json({ 
                        success: false,
                        message: 'Server error during token refresh' 
                    });
                }
            });
        } else {
            // For other token errors (not expiration)
            return res.status(403).json({ 
                success: false,
                message: 'Authentication failed' 
            });
        }
    });
};

// Helper functions to generate tokens
const generateStudentAccessToken = async (student) => {
    return jwt.sign(
        { 
            std_id: student.std_id,
            std_email: student.std_email,
            std_grade: student.std_grade
        },
        process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
};

const generateStudentRefreshToken = async (student) => {
    return jwt.sign(
        { 
            std_id: student.std_id
        },
        process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
       { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
    );
};

// Check if student is accessing their own resource
const authorizeOwner = (req, res, next) => {
  if (!req.student) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }

  const resourceId = parseInt(req.params.id || req.params.std_id);
  const isOwner = req.student.std_id === resourceId;

  if (!isOwner) {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. You can only access your own resources.' 
    });
  }

  next();
};

// Check if student belongs to specific class
const authorizeClass = (req, res, next) => {
  if (!req.student) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }

  const classId = parseInt(req.params.class_id || req.body.class_id);
  const sameClass = req.student.class_id === classId;

  if (!sameClass) {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. You can only access resources in your class.' 
    });
  }

  next();
};

// Check if student belongs to specific department
const authorizeDepartment = (req, res, next) => {
  if (!req.student) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }

  const deptId = parseInt(req.params.dpt_id || req.body.dpt_id);
  const sameDepartment = req.student.dpt_id === deptId;

  if (!sameDepartment) {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. You can only access resources in your department.' 
    });
  }

  next();
};

// Check if student belongs to specific grade
const authorizeGrade = (req, res, next) => {
  if (!req.student) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }

  const grade = req.params.grade || req.body.grade;
  const sameGrade = req.student.std_grade === grade;

  if (!sameGrade) {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. You can only access resources for your grade level.' 
    });
  }

  next();
};

module.exports = {
  authenticateStudent,
  authorizeOwner,
  authorizeClass,
  authorizeDepartment,
  authorizeGrade
};