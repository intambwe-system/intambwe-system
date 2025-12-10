const { Class, Subject, Employee, ClassSubject } = require('../../model');

const classSubjectController = {
  async getClassAssignments(req, res) {
    try {
      const { id } = req.params; // class_id

      const classObj = await Class.findByPk(id);
      if (!classObj) {
        return res.status(404).json({ success: false, message: 'Class not found' });
      }

      const assignments = await ClassSubject.findAll({
        where: { class_id: id },
        include: [
          { model: Subject },
          { model: Employee, as: 'assignedTeacher', attributes: ['emp_id', 'emp_name', 'emp_email'] },
        ],
      });

      return res.status(200).json({ success: true, data: assignments });
    } catch (error) {
      console.error('Error fetching class assignments:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  },

  async assignSubjects(req, res) {
    try {
      const { id } = req.params; // class_id
      const { assignments } = req.body;

      if (!Array.isArray(assignments) || assignments.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'assignments must be a non-empty array',
        });
      }

      const classObj = await Class.findByPk(id);
      if (!classObj) {
        return res.status(404).json({ success: false, message: 'Class not found' });
      }

      // Basic validation and creation
      const created = [];
      for (const item of assignments) {
        const { sbj_id, teacher_id, credit, total_max } = item;

        if (!sbj_id || credit == null || total_max == null) {
          return res.status(400).json({
            success: false,
            message: 'Each assignment must include sbj_id, credit, and total_max',
          });
        }

        // Validate subject
        const subject = await Subject.findByPk(sbj_id);
        if (!subject) {
          return res.status(404).json({ success: false, message: `Subject not found: ${sbj_id}` });
        }

        // Validate teacher if provided
        if (teacher_id) {
          const teacher = await Employee.findByPk(teacher_id);
          if (!teacher) {
            return res.status(404).json({ success: false, message: `Teacher not found: ${teacher_id}` });
          }
        }

        // Create or update (upsert) assignment per class+subject
        const [record] = await ClassSubject.upsert({
          class_id: id,
          sbj_id,
          teacher_id: teacher_id || null,
          credit,
          total_max,
        });
        created.push(record);
      }

      return res.status(201).json({
        success: true,
        message: 'Assignments saved successfully',
        data: created,
      });
    } catch (error) {
      console.error('Error assigning subjects to class:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  },
};

module.exports = classSubjectController;
