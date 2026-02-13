// models/Student.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Student = sequelize.define('Student', {
  std_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  std_image: {
    type: DataTypes.STRING(200),
    allowNull: true
  },

  // Personal Information
  std_fname: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  std_mname: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  std_lname: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  std_email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  std_dob: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  std_gender: {
    type: DataTypes.ENUM('Male', 'Female', 'Other'),
    allowNull: false
  },
  std_nationality: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  std_religion: {
    type: DataTypes.STRING(50),
    allowNull: true
  },

  std_place_of_birth: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  std_national_id: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true
  },
  std_password: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  password_changed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  temp_password: {
    type: DataTypes.STRING(50),
    allowNull: true
  },

  // Contact Information
  std_phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  std_address: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  std_district: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  std_country: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'Rwanda'
  },


  // Parent/Guardian Information
  father_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  father_phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },

  father_national_id: {
    type: DataTypes.STRING(50),
    allowNull: true
  },

  mother_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  mother_phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },

  mother_national_id: {
    type: DataTypes.STRING(50),
    allowNull: true
  },

  guardian_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  guardian_phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },

  guardian_address: {
    type: DataTypes.STRING(255),
    allowNull: true
  },

  // Emergency Contact
  emergency_contact_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  emergency_contact_phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },


  // Academic Information
  class_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Class',
      key: 'class_id'
    }
  },
  dpt_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Department',
      key: 'dpt_id'
    }
  },
  academic_year: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  enrollment_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  previous_school: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  previous_school_address: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  // document
  previous_school_report: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  qr_code: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  last_grade_completed: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  transfer_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  // Health Information
  medical_conditions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  allergies: {
    type: DataTypes.TEXT,
    allowNull: true
  },


  health_insurance: {
    type: DataTypes.STRING(100),
    allowNull: true
  },

  // Administrative Details
  std_status: {
    type: DataTypes.ENUM('Active', 'Inactive', 'Transferred', 'Graduated', 'Suspended'),
    allowNull: false,
    defaultValue: 'Active'
  },
  admission_number: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true
  },



  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }

}, {
  tableName: 'Student',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_student_class',
      fields: ['class_id']
    },
    {
      name: 'idx_student_status',
      fields: ['std_status']
    },
    {
      name: 'idx_student_admission',
      fields: ['admission_number']
    },

  ]
});

module.exports = Student;