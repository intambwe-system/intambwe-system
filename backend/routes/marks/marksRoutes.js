const router = require("express").Router();
const marksController = require("../../controllers/marrks/assessment.controller");

// Get all students of a subject
router.get("/subject/:sbj_id/students", marksController.getStudentsBySubject);

// Add marks for multiple students
router.post("/subject/add", marksController.addMarks);

// Update subject weight
router.put("/subject/:sbj_id/weight", marksController.updateSubjectWeight);

// Get all marks of a subject
router.get("/subject/:sbj_id/marks", marksController.getMarksBySubject);

module.exports = router;
