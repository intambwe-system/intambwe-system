const express = require('express');
const router = express.Router();
const disciplineMarksController = require('../../controllers/discipline/disciplineMarksController');
const { authenticateToken, authorizeRoles } = require('../../middleware/employeeAuth');

// CREATE discipline marks
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin', 'teacher'),
  disciplineMarksController.createDisciplineMarks
);

// READ discipline marks
router.get(
  '/',
  authenticateToken,
  disciplineMarksController.getAllDisciplineMarks
);

router.get(
  '/:id',
  authenticateToken,
  disciplineMarksController.getDisciplineMarksById
);

// UPDATE discipline marks
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('admin', 'teacher'),
  disciplineMarksController.updateDisciplineMarks
);

router.patch(
  '/:id',
  authenticateToken,
  authorizeRoles('admin', 'teacher'),
  disciplineMarksController.updateDisciplineMarks
);

// DELETE discipline marks
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  disciplineMarksController.deleteDisciplineMarks
);

module.exports = router;
