// middleware/auth.js
const jwt = require('jsonwebtoken');
const {Employee} = require('../model');

// Verify JWT token and attach employee to request
// Middleware to verify access token and automatically refresh if expired
const authenticateToken = (req, res, next) => {
    const accessToken = req.cookies?.EmployeeAccessToken;
   
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
                const employee = await Employee.findByPk(decoded.emp_id);
                
                if (!employee) {
                    return res.status(404).json({ 
                        success: false,
                        message: 'Employee not found' 
                    });
                }
                
                // Attach employee to request
                req.employee = {
                    emp_id: employee.emp_id,
                    emp_name: employee.emp_name,
                    emp_role: employee.emp_role,
                    emp_email: employee.emp_email,
                    dpt_id: employee.dpt_id
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
            const refreshToken = req.cookies?.EmployeeRefreshToken;
           
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
                    // Find employee from refresh token
                    const employee = await Employee.findByPk(refreshDecoded.emp_id);
                   
                    if (!employee) {
                        return res.status(404).json({ 
                            success: false,
                            message: 'Employee not found' 
                        });
                    }
                   
                    // Generate new tokens
                    const newAccessToken = await generateEmployeeAccessToken(employee);
                    const newRefreshToken = await generateEmployeeRefreshToken(employee);
                   
                    // Set new cookies with improved settings
                    res.cookie('EmployeeAccessToken', newAccessToken, {
                        httpOnly: true,
                        sameSite: 'strict',
                        secure: true,
                        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
                    });
                   
                    res.cookie('EmployeeRefreshToken', newRefreshToken, {
                        httpOnly: true,
                        sameSite: 'strict',
                        secure: true,
                        maxAge: 1000 * 60 * 60 * 24 * 30 // 30 days
                    });

                    console.log( '🔂 Refreshed the token ');
                    
                   
                    // Attach employee to request
                    req.employee = {
                        emp_id: employee.emp_id,
                        emp_name: employee.emp_name,
                        emp_role: employee.emp_role,
                        emp_email: employee.emp_email,
                        dpt_id: employee.dpt_id
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
const generateEmployeeAccessToken = async (employee) => {
    return jwt.sign(
        { 
            emp_id: employee.emp_id,
            emp_role: employee.emp_role,
            emp_email: employee.emp_email
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
    );
};

const generateEmployeeRefreshToken = async (employee) => {
    return jwt.sign(
        { 
            emp_id: employee.emp_id
        },
        process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
    );
};


// Check if user has required role(s)
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.employee) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    if (!allowedRoles.includes(req.employee.emp_role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Insufficient permissions.',
        requiredRoles: allowedRoles,
        yourRole: req.employee.emp_role
      });
    }

    next();
  };
};

// Check if user is accessing their own resource or is admin
const authorizeOwnerOrAdmin = (req, res, next) => {
  if (!req.employee) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }

  const resourceId = parseInt(req.params.id);
  const isOwner = req.employee.emp_id === resourceId;
  const isAdmin = req.employee.emp_role === 'admin';

  if (!isOwner && !isAdmin) {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. You can only access your own resources.' 
    });
  }

  next();
};

// Check if user belongs to specific department
const authorizeDepartment = (req, res, next) => {
  if (!req.employee) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }

  const deptId = parseInt(req.params.dpt_id || req.body.dpt_id);
  const isAdmin = req.employee.emp_role === 'admin';
  const sameDepartment = req.employee.dpt_id === deptId;

  if (!isAdmin && !sameDepartment) {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. You can only access resources in your department.' 
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  authorizeOwnerOrAdmin,
  authorizeDepartment,
  generateEmployeeAccessToken,
  generateEmployeeRefreshToken,
};




