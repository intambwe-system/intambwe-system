const Student = require("../../model/Student");
const Subject = require("../../model/Subject");
const Employee = require("../../model/Employee");
const StudentMark = require("../../model/StudentMark");
const SubjectWeight = require("../../model/SubjectWeight");
const { Op } = require("sequelize");

/**
 * Get all students of a subject's class
 */
exports.getStudentsBySubject = async (req, res) => {
  try {
    const { sbj_id } = req.params;

    const subject = await Subject.findByPk(sbj_id);
    if (!subject) return res.status(404).json({ message: "Subject not found" });

    const students = await Student.findAll({ where: { class_id: subject.class_id } });
    res.json(students);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Add marks (assessment or exam) for multiple students
 */
exports.addMarks = async (req, res) => {
  try {
    const { sbj_id, emp_id, mark_type, marks } = req.body;
    // marks = [{ std_id: 1, mark: 20 }, { std_id: 2, mark: 18 }]

    // Get subject weight
    const weight = await SubjectWeight.findOne({ where: { sbj_id } });
    const assessmentWeight = weight ? weight.assessment_weight : 30;
    const examWeight = weight ? weight.exam_weight : 70;

    let results = [];

    for (let m of marks) {
      // Check if exam mark already exists
      if (mark_type === "exam") {
        const existing = await StudentMark.findOne({
          where: { std_id: m.std_id, sbj_id, mark_type: "exam" },
        });
        if (existing) continue; // skip if exam already recorded
      }

      // Calculate total_score
      let total_score = m.mark;
      if (mark_type === "assessment") {
        total_score = (m.mark * assessmentWeight) / 100;
      } else if (mark_type === "exam") {
        total_score = (m.mark * examWeight) / 100;
      }

      const mark = await StudentMark.create({
        std_id: m.std_id,
        sbj_id,
        emp_id,
        mark_type,
        marks: m.mark,
        weight_percentage: mark_type === "exam" ? examWeight : assessmentWeight,
        total_score,
      });

      results.push(mark);
    }

    res.json({ message: "Marks added successfully", results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Update weight of a subject
 */
exports.updateSubjectWeight = async (req, res) => {
  try {
    const { sbj_id } = req.params;
    const { assessment_weight, exam_weight } = req.body;

    let weight = await SubjectWeight.findOne({ where: { sbj_id } });

    if (!weight) {
      weight = await SubjectWeight.create({ sbj_id, assessment_weight, exam_weight });
    } else {
      weight.assessment_weight = assessment_weight;
      weight.exam_weight = exam_weight;
      await weight.save();
    }

    res.json({ message: "Weights updated", weight });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get marks of a subject with students
 */
exports.getMarksBySubject = async (req, res) => {
  try {
    const { sbj_id } = req.params;
    const marks = await StudentMark.findAll({
      where: { sbj_id },
      include: [
        { model: Student, as: "Student" },
        { model: Employee, as: "gradedBy", attributes: ["emp_name"] },
      ],
    });

    res.json(marks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
