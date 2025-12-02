// middleware/auth.js
const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');

// Verify JWT token and attach employee to request
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Fetch employee details
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

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ 
        success: false, 
        message: 'Token expired' 
      });
    }
    return res.status(500).json({ 
      success: false, 
      message: 'Authentication error' 
    });
  }
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
  authorizeDepartment
};




