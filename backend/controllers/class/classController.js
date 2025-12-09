const { Op } = require("sequelize");
const {
  Class,
  Department,
  Employee,
  Student,
  Subject,
  TimetableEntry,
  Attendance,
  SpecialEvent,
  Trade,
} = require("../../model");
const classValidator = require("../../validators/classValidator");

const classController = {
  async createClass(req, res) {
    try {
      const data = req.body;

      const validation = classValidator.validateClassData(data);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        });
      }

      if (data.dpt_id) {
        const department = await Department.findByPk(data.dpt_id);
        if (!department) {
          return res.status(404).json({
            success: false,
            message: "Department not found",
          });
        }
      }

      if (data.emp_id) {
        const teacher = await Employee.findByPk(data.emp_id);
        if (!teacher) {
          return res.status(404).json({
            success: false,
            message: "Employee not found",
          });
        }
      }

      if (data.tradeId) {
        const trade = await Trade.findByPk(data.tradeId);
        if (!trade)
          return res
            .status(404)
            .json({ success: false, message: "Trade not found" });
      }

      if (data.emp_id) {
        const teacherExists = await Class.findOne({
          where: { emp_id: data.emp_id },
        });

        if (teacherExists) {
          const classTeacher = await Employee.findOne({
            where: { emp_id: teacherExists.emp_id },
          });

          return res.status(400).json({
            success: true,
            message: `There is already a class teacher named ${classTeacher.emp_name}`,
          });
        }
      }

      if (data.class_name) {
        const classExists = await Class.findOne({
          where: { class_name: data.class_name },
        });

        if (classExists) {
          return res.status(400).json({
            success: true,
            message: `You already have a class named ${data.class_name}`,
          });
        }
      }

      const newClass = await Class.create(data);

      return res.status(201).json({
        success: true,
        message: "Class created successfully",
        data: newClass,
      });
    } catch (error) {
      console.error("Error creating class:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },

  async getAllClasses(req, res) {
    try {
      const { dpt_id, emp_id, tradeId } = req.query;

      const whereClause = {};
      if (dpt_id) whereClause.dpt_id = dpt_id;
      if (emp_id) whereClause.emp_id = emp_id;
      if (tradeId) whereClause.tradeId = tradeId;

      const classes = await Class.findAll({
        where: whereClause,
        include: [
          { model: Department },
          { model: Employee, as: "classTeacher" },
          { model: Trade, as: "Trade" },
        ],
        order: [["class_name", "ASC"]],
      });

      return res.status(200).json({
        success: true,
        data: classes,
      });
    } catch (error) {
      console.error("Error fetching classes:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },

  async getClassById(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid class ID",
        });
      }

      const classObj = await Class.findByPk(id, {
        include: [
          { model: Department },
          { model: Employee, as: "classTeacher" },
        ],
      });

      if (!classObj) {
        return res.status(404).json({
          success: false,
          message: "Class not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: classObj,
      });
    } catch (error) {
      console.error("Error fetching class:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },

  async updateClass(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid class ID",
        });
      }

      const classObj = await Class.findByPk(id);
      if (!classObj) {
        return res.status(404).json({
          success: false,
          message: "Class not found",
        });
      }

      const validation = classValidator.validateClassData(updateData, true);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        });
      }

      if (updateData.dpt_id) {
        const department = await Department.findByPk(updateData.dpt_id);
        if (!department) {
          return res.status(404).json({
            success: false,
            message: "Department not found",
          });
        }
      }

      if (updateData.emp_id) {
        const teacher = await Employee.findByPk(updateData.emp_id);
        if (!teacher) {
          return res.status(404).json({
            success: false,
            message: "Employee not found",
          });
        }
      }

      if (updateData.tradeId) {
        const trade = await Trade.findByPk(updateData.tradeId);
        if (!trade)
          return res
            .status(404)
            .json({ success: false, message: "Trade not found" });
      }

      if (updateData.emp_id) {
        const teacherExists = await Class.findOne({
          where: {
            [Op.and]: [
              { emp_id: updateData.emp_id },
              { class_id: { [Op.ne]: classObj.class_id } },
            ],
          },
        });

        if (teacherExists) {
          const classTeacher = await Employee.findOne({
            where: { emp_id: teacherExists.emp_id },
          });

          return res.status(400).json({
            success: true,
            message: `There is already a class teacher named ${classTeacher.emp_name}`,
          });
        }
      }

      if (updateData.class_name) {
        const classExists = await Class.findOne({
          where: {
            [Op.and]: [
              { class_name: updateData.class_name },
              { class_id: { [Op.ne]: classObj.class_id } },
            ],
          },
        });

        console.log("classes found 🎉🎉🎉");
        console.log(classExists);

        if (classExists) {
          return res.status(400).json({
            success: true,
            message: `You already have a class named ${updateData.class_name}`,
          });
        }
      }

      await classObj.update(updateData);

      const updated = await Class.findByPk(id, {
        include: [
          { model: Department },
          { model: Employee, as: "classTeacher" },
          { model: Trade, as: "Trade" },
        ],
      });

      return res.status(200).json({
        success: true,
        message: "Class updated successfully",
        data: updated,
      });
    } catch (error) {
      console.error("Error updating class:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },

  async deleteClass(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid class ID",
        });
      }

      const classObj = await Class.findByPk(id);
      if (!classObj) {
        return res.status(404).json({
          success: false,
          message: "Class not found",
        });
      }

      await classObj.destroy();

      return res.status(200).json({
        success: true,
        message: "Class deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting class:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },

  async getClassStudents(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid class ID",
        });
      }

      const classObj = await Class.findByPk(id);
      if (!classObj) {
        return res.status(404).json({
          success: false,
          message: "Class not found",
        });
      }

      const students = await Student.findAll({
        where: { class_id: id },
        order: [
          ["std_lname", "ASC"],
          ["std_fname", "ASC"],
        ],
      });

      return res.status(200).json({
        success: true,
        data: students,
      });
    } catch (error) {
      console.error("Error fetching class students:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },

  async getClassSubjects(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid class ID",
        });
      }

      const classObj = await Class.findByPk(id);
      if (!classObj) {
        return res.status(404).json({
          success: false,
          message: "Class not found",
        });
      }

      const subjects = await Subject.findAll({
        where: { class_id: id },
      });

      return res.status(200).json({
        success: true,
        data: subjects,
      });
    } catch (error) {
      console.error("Error fetching class subjects:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },

  async getClassOverview(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid class ID",
        });
      }

      const classObj = await Class.findByPk(id, {
        include: [
          { model: Department },
          { model: Employee, as: "classTeacher" },
        ],
      });

      if (!classObj) {
        return res.status(404).json({
          success: false,
          message: "Class not found",
        });
      }

      const [students, subjects, timetableEntries, events, attendance] =
        await Promise.all([
          Student.findAll({ where: { class_id: id } }),
          Subject.findAll({ where: { class_id: id } }),
          TimetableEntry.findAll({ where: { class_id: id } }),
          SpecialEvent.findAll({ where: { class_id: id } }),
          Attendance.findAll({ where: { class_id: id } }),
        ]);

      return res.status(200).json({
        success: true,
        data: {
          class: classObj,
          studentsCount: students.length,
          subjectsCount: subjects.length,
          timetableEntriesCount: timetableEntries.length,
          eventsCount: events.length,
          attendanceRecordsCount: attendance.length,
        },
      });
    } catch (error) {
      console.error("Error fetching class overview:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },
};

module.exports = classController;
