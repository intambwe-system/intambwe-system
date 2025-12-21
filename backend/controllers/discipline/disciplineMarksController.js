const { DisciplineMarks, Student, Class, Employee } = require('../../model');
const { Op } = require('sequelize');

const disciplineMarksController = {

  // CREATE discipline marks
 // CREATE or UPDATE discipline marks
async createDisciplineMarks(req, res) {
  try {
    const data = req.body;

    // Basic required validation
    if (!data.std_id || !data.ac_year || !data.semester) {
      return res.status(400).json({
        success: false,
        message: 'std_id, ac_year and semester are required'
      });
    }

    // Check student exists
    const student = await Student.findByPk(data.std_id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check class exists (if provided)
    if (data.class_id) {
      const classObj = await Class.findByPk(data.class_id);
      if (!classObj) {
        return res.status(404).json({
          success: false,
          message: 'Class not found'
        });
      }
    }

    // Check employee exists (if provided)
    if (data.emp_id) {
      const employee = await Employee.findByPk(data.emp_id);
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }
    }

    // Check if discipline record already exists
    let record = await DisciplineMarks.findOne({
      where: {
        std_id: data.std_id,
        semester: data.semester,
        ac_year: data.ac_year
      }
    });

    if (record) {
      // Update existing record
      await record.update(data);
      return res.status(200).json({
        success: true,
        message: 'Discipline marks updated successfully',
        data: record
      });
    } else {
      // Create new record
      record = await DisciplineMarks.create(data);
      return res.status(201).json({
        success: true,
        message: 'Discipline marks recorded successfully',
        data: record
      });
    }

  } catch (error) {
    console.error('Error creating/updating discipline marks:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}
,

  // GET all discipline marks
  async getAllDisciplineMarks(req, res) {
    try {
      const { std_id, class_id, ac_year, semester } = req.query;

      const whereClause = {};
      if (std_id) whereClause.std_id = std_id;
      if (class_id) whereClause.class_id = class_id;
      if (ac_year) whereClause.ac_year = ac_year;
      if (semester) whereClause.semester = semester;

      const records = await DisciplineMarks.findAll({
        where: whereClause,
        include: [
          { model: Student },
          { model: Class },
          { model: Employee, }
        ],
        order: [['date_recorded', 'DESC']]
      });

      return res.status(200).json({
        success: true,
        data: records
      });

    } catch (error) {
      console.error('Error fetching discipline marks:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // GET discipline marks by ID
  async getDisciplineMarksById(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid discipline ID'
        });
      }

      const record = await DisciplineMarks.findByPk(id, {
        include: [
          { model: Student },
          { model: Class },
          { model: Employee, }
        ]
      });

      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'Discipline record not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: record
      });

    } catch (error) {
      console.error('Error fetching discipline marks:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // UPDATE discipline marks
  async updateDisciplineMarks(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid discipline ID'
        });
      }

      const record = await DisciplineMarks.findByPk(id);
      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'Discipline record not found'
        });
      }

      await record.update(updateData);

      const updated = await DisciplineMarks.findByPk(id, {
        include: [
          { model: Student },
          { model: Class },
          { model: Employee, }
        ]
      });

      return res.status(200).json({
        success: true,
        message: 'Discipline marks updated successfully',
        data: updated
      });

    } catch (error) {
      console.error('Error updating discipline marks:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // DELETE discipline marks
  async deleteDisciplineMarks(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid discipline ID'
        });
      }

      const record = await DisciplineMarks.findByPk(id);
      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'Discipline record not found'
        });
      }

      await record.destroy();

      return res.status(200).json({
        success: true,
        message: 'Discipline marks deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting discipline marks:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
};

module.exports = disciplineMarksController;
