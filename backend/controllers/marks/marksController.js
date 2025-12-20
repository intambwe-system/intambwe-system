const { Marks, Student, Subject, Class, Employee } = require('../../model');
const { Op } = require('sequelize');
const marksValidator = require('../../validators/marksValidator');

const marksController = {
  async createMarks(req, res) {
    try {
      const data = req.body;
      
      const validation = marksValidator.validateMarksData(data);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      const student = await Student.findByPk(data.std_id);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      const subject = await Subject.findByPk(data.sbj_id);
      if (!subject) {
        return res.status(404).json({
          success: false,
          message: 'Subject not found'
        });
      }

      if (data.class_id) {
        const classObj = await Class.findByPk(data.class_id);
        if (!classObj) {
          return res.status(404).json({
            success: false,
            message: 'Class not found'
          });
        }
      }

      if (data.emp_id) {
        const teacher = await Employee.findByPk(data.emp_id);
        if (!teacher) {
          return res.status(404).json({
            success: false,
            message: 'Employee not found'
          });
        }
      }

      // Validate FA array if provided
      if (data.FA !== undefined) {
        if (!Array.isArray(data.FA)) {
          return res.status(400).json({
            success: false,
            message: 'FA must be an array'
          });
        }
        // Validate each FA entry
        for (const entry of data.FA) {
          if (!entry.score || !entry.maxScore || !entry.label) {
            return res.status(400).json({
              success: false,
              message: 'Each FA entry must have score, maxScore, and label'
            });
          }
        }
      }

      // Validate IA array if provided
      if (data.IA !== undefined) {
        if (!Array.isArray(data.IA)) {
          return res.status(400).json({
            success: false,
            message: 'IA must be an array'
          });
        }
        // Validate each IA entry
        for (const entry of data.IA) {
          if (!entry.score || !entry.maxScore || !entry.label) {
            return res.status(400).json({
              success: false,
              message: 'Each IA entry must have score, maxScore, and label'
            });
          }
        }
      }

      // Prepare data for creation
      const marksData = {
        std_id: data.std_id,
        sbj_id: data.sbj_id,
        class_id: data.class_id || null,
        emp_id: data.emp_id || null,
        ac_year: data.ac_year || null,
        semester: data.semester || null,
        FA: data.FA || null,
        IA: data.IA || null,
        CA_score: data.CA_score || null,
        CA_maxScore: data.CA_maxScore || null
      };

      // Check for existing record
      const existing = await Marks.findOne({
        where: {
          std_id: marksData.std_id,
          sbj_id: marksData.sbj_id,
          semester: marksData.semester,
          ac_year: marksData.ac_year
        }
      });

      if (existing) {
        await existing.update(marksData);
        return res.status(200).json({
          success: true,
          message: 'Marks updated successfully',
          data: existing
        });
      }

      const marks = await Marks.create(marksData);

      return res.status(201).json({
        success: true,
        message: 'Marks recorded successfully',
        data: marks
      });
    } catch (error) {
      console.error('Error creating marks:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  async getMarks(req, res) {
    try {
      const {
        std_id,
        sbj_id,
        class_id,
        semester,
        ac_year,
        page = 1,
        limit = 20
      } = req.query;

      const whereClause = {};
      if (std_id) whereClause.std_id = std_id;
      if (sbj_id) whereClause.sbj_id = sbj_id;
      if (class_id) whereClause.class_id = class_id;
      if (semester) whereClause.semester = semester;
      if (ac_year) whereClause.ac_year = ac_year;

      const offset = (page - 1) * limit;

      const { count, rows } = await Marks.findAndCountAll({
        where: whereClause,
        include: [
          { model: Student },
          { model: Subject },
          { model: Class },
          { model: Employee, as: 'gradedBy' }
        ],
        order: [['date_recorded', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      return res.status(200).json({
        success: true,
        data: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching marks:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  async getMarksById(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid marks ID'
        });
      }

      const marks = await Marks.findByPk(id, {
        include: [
          { model: Student },
          { model: Subject },
          { model: Class },
          { model: Employee, as: 'gradedBy' }
        ]
      });

      if (!marks) {
        return res.status(404).json({
          success: false,
          message: 'Marks record not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: marks
      });
    } catch (error) {
      console.error('Error fetching marks record:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  async updateMarks(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid marks ID'
        });
      }

      const marks = await Marks.findByPk(id);
      if (!marks) {
        return res.status(404).json({
          success: false,
          message: 'Marks record not found'
        });
      }

      const validation = marksValidator.validateMarksData(updateData, true);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      // Validate FA array if provided
      if (updateData.FA !== undefined) {
        if (!Array.isArray(updateData.FA)) {
          return res.status(400).json({
            success: false,
            message: 'FA must be an array'
          });
        }
        for (const entry of updateData.FA) {
          if (!entry.score || !entry.maxScore || !entry.label) {
            return res.status(400).json({
              success: false,
              message: 'Each FA entry must have score, maxScore, and label'
            });
          }
        }
      }

      // Validate IA array if provided
      if (updateData.IA !== undefined) {
        if (!Array.isArray(updateData.IA)) {
          return res.status(400).json({
            success: false,
            message: 'IA must be an array'
          });
        }
        for (const entry of updateData.IA) {
          if (!entry.score || !entry.maxScore || !entry.label) {
            return res.status(400).json({
              success: false,
              message: 'Each IA entry must have score, maxScore, and label'
            });
          }
        }
      }

      await marks.update(updateData);

      const updated = await Marks.findByPk(id, {
        include: [
          { model: Student },
          { model: Subject },
          { model: Class },
          { model: Employee, as: 'gradedBy' }
        ]
      });

      return res.status(200).json({
        success: true,
        message: 'Marks updated successfully',
        data: updated
      });
    } catch (error) {
      console.error('Error updating marks:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  async deleteMarks(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid marks ID'
        });
      }

      const marks = await Marks.findByPk(id);
      if (!marks) {
        return res.status(404).json({
          success: false,
          message: 'Marks record not found'
        });
      }

      await marks.destroy();

      return res.status(200).json({
        success: true,
        message: 'Marks record deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting marks:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  async getStudentTranscript(req, res) {
    try {
      const { std_id } = req.params;
      const { ac_year } = req.query;

      if (!std_id || isNaN(std_id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid student ID'
        });
      }

      const whereClause = { std_id };
      if (ac_year) whereClause.ac_year = ac_year;

      const records = await Marks.findAll({
        where: whereClause,
        include: [
          { model: Subject },
          { model: Class }
        ],
        order: [['semester', 'ASC'], ['date_recorded', 'ASC']]
      });

      return res.status(200).json({
        success: true,
        data: records
      });
    } catch (error) {
      console.error('Error fetching transcript:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // Add FA assessment to existing record
  async addFormativeAssessment(req, res) {
    try {
      const { id } = req.params;
      const { score, maxScore, label } = req.body;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid marks ID'
        });
      }

      if (score === undefined || maxScore === undefined || !label) {
        return res.status(400).json({
          success: false,
          message: 'Score, maxScore, and label are required'
        });
      }

      const marks = await Marks.findByPk(id);
      if (!marks) {
        return res.status(404).json({
          success: false,
          message: 'Marks record not found'
        });
      }

      // Get current FA array or initialize empty array
      const currentFA = marks.FA ? [...marks.FA] : [];
      currentFA.push({ score, maxScore, label });

      // Update with new array
      await marks.update({ FA: currentFA });

      // Fetch updated record
      const updated = await Marks.findByPk(id, {
        include: [
          { model: Student },
          { model: Subject },
          { model: Class },
          { model: Employee, as: 'gradedBy' }
        ]
      });

      return res.status(200).json({
        success: true,
        message: 'Formative assessment added successfully',
        data: updated
      });
    } catch (error) {
      console.error('Error adding FA:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // Add IA assessment to existing record
  async addIntegratedAssessment(req, res) {
    try {
      const { id } = req.params;
      const { score, maxScore, label } = req.body;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid marks ID'
        });
      }

      if (score === undefined || maxScore === undefined || !label) {
        return res.status(400).json({
          success: false,
          message: 'Score, maxScore, and label are required'
        });
      }

      const marks = await Marks.findByPk(id);
      if (!marks) {
        return res.status(404).json({
          success: false,
          message: 'Marks record not found'
        });
      }

      // Get current IA array or initialize empty array
      const currentIA = marks.IA ? [...marks.IA] : [];
      currentIA.push({ score, maxScore, label });

      // Update with new array
      await marks.update({ IA: currentIA });

      // Fetch updated record
      const updated = await Marks.findByPk(id, {
        include: [
          { model: Student },
          { model: Subject },
          { model: Class },
          { model: Employee, as: 'gradedBy' }
        ]
      });

      return res.status(200).json({
        success: true,
        message: 'Integrated assessment added successfully',
        data: updated
      });
    } catch (error) {
      console.error('Error adding IA:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // Update CA
  async updateComprehensiveAssessment(req, res) {
    try {
      const { id } = req.params;
      const { CA_score, CA_maxScore } = req.body;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid marks ID'
        });
      }

      if (CA_score === undefined || CA_maxScore === undefined) {
        return res.status(400).json({
          success: false,
          message: 'CA_score and CA_maxScore are required'
        });
      }

      const marks = await Marks.findByPk(id);
      if (!marks) {
        return res.status(404).json({
          success: false,
          message: 'Marks record not found'
        });
      }

      await marks.update({ CA_score, CA_maxScore });

      // Fetch updated record
      const updated = await Marks.findByPk(id, {
        include: [
          { model: Student },
          { model: Subject },
          { model: Class },
          { model: Employee, as: 'gradedBy' }
        ]
      });

      return res.status(200).json({
        success: true,
        message: 'Comprehensive assessment updated successfully',
        data: updated
      });
    } catch (error) {
      console.error('Error updating CA:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
};

module.exports = marksController;