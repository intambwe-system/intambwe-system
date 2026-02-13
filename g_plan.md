Claude’s Plan
Examination & Assessment Platform - Implementation Plan
Overview
Build a comprehensive exam/assessment feature integrated with the existing Intambwe School Management System.

Models Analysis: Reuse vs Create
REUSE EXISTING (No Changes Needed)
Model	Location	Purpose in Exam System
Student	backend/model/Student.js	Exam takers, enrollment
Employee	backend/model/Employee.js	Exam creators, graders, invigilators
Class	backend/model/Class.js	Group exams by class
Subject	backend/model/Subject.js	Organize questions by subject
Department	backend/model/Department.js	Department-level reports
SubjectWeight	backend/model/SubjectWeight.js	30% assessment / 70% exam weights
ClassSubject	backend/model/ClassSubject.js	Teacher-class-subject assignments
EXTEND EXISTING (Minor Additions)
Model	Changes Needed
Marks	Add exam_id field to link scores to specific exams
CREATE NEW MODELS
1. Exam Model

// backend/model/Exam.js
{
  exam_id: INTEGER, PRIMARY KEY, AUTO_INCREMENT,
  uuid: UUID, UNIQUE,
  title: STRING(255), NOT NULL,
  description: TEXT,
  instructions: TEXT,

  // References (REUSE existing)
  sbj_id: INTEGER, FK → Subject,
  class_id: INTEGER, FK → Class,
  created_by: INTEGER, FK → Employee,

  // Exam Configuration
  exam_mode: ENUM('graded', 'survey', 'practice'), DEFAULT 'graded',
  status: ENUM('draft', 'published', 'archived'), DEFAULT 'draft',

  // Timing
  has_time_limit: BOOLEAN, DEFAULT false,
  time_limit_minutes: INTEGER,
  auto_submit_on_timeout: BOOLEAN, DEFAULT true,

  // Scheduling
  start_date: DATETIME,
  end_date: DATETIME,

  // Attempts
  max_attempts: INTEGER, DEFAULT 1,

  // Grading
  pass_percentage: DECIMAL(5,2), DEFAULT 50.00,
  total_points: DECIMAL(10,2), DEFAULT 0,

  // Randomization
  randomize_questions: BOOLEAN, DEFAULT false,
  randomize_options: BOOLEAN, DEFAULT false,

  // Results Display
  show_results_immediately: BOOLEAN, DEFAULT false,
  show_correct_answers: BOOLEAN, DEFAULT false,

  // Security
  access_password: STRING(255),
  detect_tab_switch: BOOLEAN, DEFAULT false,
  max_tab_switches: INTEGER, DEFAULT 3,

  // Metadata
  ac_year: STRING(20),
  semester: STRING(50),

  timestamps: createdAt, updatedAt
}
2. Question Model

// backend/model/Question.js
{
  question_id: INTEGER, PRIMARY KEY, AUTO_INCREMENT,
  uuid: UUID, UNIQUE,
  exam_id: INTEGER, FK → Exam,

  question_text: TEXT, NOT NULL,
  question_type: ENUM(
    'multiple_choice_single',
    'multiple_choice_multiple',
    'true_false',
    'fill_in_blank',
    'short_answer',
    'essay'
  ), NOT NULL,

  // Configuration
  points: DECIMAL(5,2), DEFAULT 1.00,
  question_order: INTEGER, DEFAULT 0,
  difficulty: ENUM('easy', 'medium', 'hard'), DEFAULT 'medium',

  // For fill-in-blank
  case_sensitive: BOOLEAN, DEFAULT false,
  correct_answers: JSON, // Array of acceptable answers

  // For essay/short answer
  word_limit_min: INTEGER,
  word_limit_max: INTEGER,
  requires_manual_grading: BOOLEAN, DEFAULT false,

  // Partial credit for multiple choice
  allow_partial_credit: BOOLEAN, DEFAULT false,

  // Media
  image_url: STRING(500),

  // Explanation shown after grading
  explanation: TEXT,

  created_by: INTEGER, FK → Employee,
  timestamps: createdAt, updatedAt
}
3. AnswerOption Model

// backend/model/AnswerOption.js
{
  option_id: INTEGER, PRIMARY KEY, AUTO_INCREMENT,
  question_id: INTEGER, FK → Question, NOT NULL,

  option_text: TEXT, NOT NULL,
  option_order: INTEGER, DEFAULT 0,
  is_correct: BOOLEAN, DEFAULT false,

  // Feedback for this option
  feedback: TEXT,

  // Media
  image_url: STRING(500),

  timestamps: createdAt, updatedAt
}
4. ExamAttempt Model

// backend/model/ExamAttempt.js
{
  attempt_id: INTEGER, PRIMARY KEY, AUTO_INCREMENT,
  uuid: UUID, UNIQUE,

  exam_id: INTEGER, FK → Exam, NOT NULL,
  std_id: INTEGER, FK → Student, NOT NULL,
  class_id: INTEGER, FK → Class,

  attempt_number: INTEGER, DEFAULT 1,
  status: ENUM('in_progress', 'submitted', 'auto_submitted', 'graded'), DEFAULT 'in_progress',

  // Timing
  started_at: DATETIME, NOT NULL,
  submitted_at: DATETIME,
  time_taken_seconds: INTEGER,

  // Scoring
  total_score: DECIMAL(10,2), DEFAULT 0,
  max_score: DECIMAL(10,2),
  percentage: DECIMAL(5,2),
  pass_status: ENUM('passed', 'failed', 'pending'), DEFAULT 'pending',

  // Progress
  questions_answered: INTEGER, DEFAULT 0,

  // Security
  ip_address: STRING(45),
  tab_switches: INTEGER, DEFAULT 0,

  // Grading
  graded_by: INTEGER, FK → Employee,
  graded_at: DATETIME,
  instructor_feedback: TEXT,

  // UNIQUE: One attempt per student per exam per attempt_number
  UNIQUE: (exam_id, std_id, attempt_number),

  timestamps: createdAt, updatedAt
}
5. StudentResponse Model

// backend/model/StudentResponse.js
{
  response_id: INTEGER, PRIMARY KEY, AUTO_INCREMENT,

  attempt_id: INTEGER, FK → ExamAttempt, NOT NULL,
  question_id: INTEGER, FK → Question, NOT NULL,

  // Response data (flexible storage)
  selected_option_id: INTEGER, FK → AnswerOption, // For single choice
  selected_option_ids: JSON, // For multiple choice [1, 3, 5]
  text_response: TEXT, // For essay/short answer/fill-in-blank

  // Grading
  is_correct: BOOLEAN,
  points_earned: DECIMAL(5,2), DEFAULT 0,
  max_points: DECIMAL(5,2),

  // Manual grading
  requires_manual_grading: BOOLEAN, DEFAULT false,
  manually_graded: BOOLEAN, DEFAULT false,
  grader_id: INTEGER, FK → Employee,
  grader_feedback: TEXT,
  graded_at: DATETIME,

  // Metadata
  time_spent_seconds: INTEGER,
  is_flagged: BOOLEAN, DEFAULT false,
  answered_at: DATETIME,

  // UNIQUE: One response per question per attempt
  UNIQUE: (attempt_id, question_id),

  timestamps: createdAt, updatedAt
}
Model Associations

// Add to backend/model/index.js

// Exam associations
Exam.belongsTo(Subject, { foreignKey: 'sbj_id' });
Exam.belongsTo(Class, { foreignKey: 'class_id' });
Exam.belongsTo(Employee, { as: 'creator', foreignKey: 'created_by' });
Exam.hasMany(Question, { foreignKey: 'exam_id' });
Exam.hasMany(ExamAttempt, { foreignKey: 'exam_id' });

Subject.hasMany(Exam, { foreignKey: 'sbj_id' });
Class.hasMany(Exam, { foreignKey: 'class_id' });

// Question associations
Question.belongsTo(Exam, { foreignKey: 'exam_id' });
Question.belongsTo(Employee, { as: 'creator', foreignKey: 'created_by' });
Question.hasMany(AnswerOption, { foreignKey: 'question_id' });
Question.hasMany(StudentResponse, { foreignKey: 'question_id' });

// AnswerOption associations
AnswerOption.belongsTo(Question, { foreignKey: 'question_id' });

// ExamAttempt associations
ExamAttempt.belongsTo(Exam, { foreignKey: 'exam_id' });
ExamAttempt.belongsTo(Student, { foreignKey: 'std_id' });
ExamAttempt.belongsTo(Class, { foreignKey: 'class_id' });
ExamAttempt.belongsTo(Employee, { as: 'grader', foreignKey: 'graded_by' });
ExamAttempt.hasMany(StudentResponse, { foreignKey: 'attempt_id' });

Student.hasMany(ExamAttempt, { foreignKey: 'std_id' });

// StudentResponse associations
StudentResponse.belongsTo(ExamAttempt, { foreignKey: 'attempt_id' });
StudentResponse.belongsTo(Question, { foreignKey: 'question_id' });
StudentResponse.belongsTo(AnswerOption, { foreignKey: 'selected_option_id' });
StudentResponse.belongsTo(Employee, { as: 'grader', foreignKey: 'grader_id' });
API Endpoints
Exam Management (Teacher/Admin)

POST   /api/exam                    # Create exam
GET    /api/exam                    # List exams (with filters)
GET    /api/exam/:id                # Get exam details
PUT    /api/exam/:id                # Update exam
DELETE /api/exam/:id                # Delete exam
POST   /api/exam/:id/publish        # Publish exam
POST   /api/exam/:id/duplicate      # Duplicate exam
Question Management

POST   /api/exam/:examId/question           # Add question
GET    /api/exam/:examId/question           # Get all questions
PUT    /api/exam/:examId/question/:id       # Update question
DELETE /api/exam/:examId/question/:id       # Delete question
POST   /api/exam/:examId/question/reorder   # Reorder questions
Answer Options

POST   /api/question/:questionId/option     # Add option
PUT    /api/question/:questionId/option/:id # Update option
DELETE /api/question/:questionId/option/:id # Delete option
Exam Taking (Student)

GET    /api/exam/available                  # Get available exams
POST   /api/exam/:id/start                  # Start attempt
GET    /api/attempt/:id                     # Get attempt with questions
PUT    /api/attempt/:id/response            # Submit response
POST   /api/attempt/:id/submit              # Final submission
GET    /api/attempt/:id/result              # Get results
Grading (Teacher)

GET    /api/grading/pending                 # Exams needing grading
GET    /api/grading/exam/:examId            # All responses for exam
PUT    /api/grading/response/:responseId    # Grade response
POST   /api/grading/attempt/:attemptId/finalize  # Finalize grading
Analytics

GET    /api/exam/:id/analytics              # Exam statistics
GET    /api/exam/:id/question-analytics     # Per-question stats
GET    /api/student/:id/exam-history        # Student exam history
Backend File Structure

backend/
├── model/
│   ├── Exam.js              # NEW
│   ├── Question.js          # NEW
│   ├── AnswerOption.js      # NEW
│   ├── ExamAttempt.js       # NEW
│   ├── StudentResponse.js   # NEW
│   └── index.js             # UPDATE (add associations)
│
├── controllers/
│   └── exam/
│       ├── examController.js           # NEW
│       ├── questionController.js       # NEW
│       ├── attemptController.js        # NEW
│       ├── gradingController.js        # NEW
│       └── examAnalyticsController.js  # NEW
│
├── routes/
│   └── exam/
│       ├── examRoutes.js       # NEW
│       ├── questionRoutes.js   # NEW
│       ├── attemptRoutes.js    # NEW
│       └── gradingRoutes.js    # NEW
│
├── validators/
│   └── exam/
│       ├── examValidator.js        # NEW
│       ├── questionValidator.js    # NEW
│       └── attemptValidator.js     # NEW
│
└── services/
    └── exam/
        ├── gradingService.js       # NEW (auto-grading logic)
        └── examAnalyticsService.js # NEW
Frontend Components

frontend/src/
├── pages/dashboard/
│   └── exam/
│       ├── ExamManagement.jsx         # List/manage exams
│       ├── ExamCreator.jsx            # Create/edit exam
│       ├── QuestionEditor.jsx         # Add/edit questions
│       ├── ExamPreview.jsx            # Preview exam
│       ├── ExamGrading.jsx            # Grade responses
│       ├── ExamAnalytics.jsx          # View statistics
│       │
│       └── student/
│           ├── AvailableExams.jsx     # List available exams
│           ├── TakeExam.jsx           # Exam taking interface
│           ├── ExamReview.jsx         # Review answers
│           └── ExamResults.jsx        # View results
│
├── components/
│   └── exam/
│       ├── QuestionCard.jsx           # Display question
│       ├── AnswerOptions.jsx          # MCQ options
│       ├── Timer.jsx                  # Countdown timer
│       ├── QuestionNavigator.jsx      # Question palette
│       ├── ExamProgress.jsx           # Progress bar
│       └── GradingRubric.jsx          # Manual grading UI
│
└── services/
    └── examService.js                 # API calls
Implementation Order
Phase 1: Backend Models (Priority)
Create Exam model
Create Question model
Create AnswerOption model
Create ExamAttempt model
Create StudentResponse model
Update model/index.js with associations
Sync database
Phase 2: Backend API
Exam CRUD routes & controller
Question CRUD routes & controller
Attempt start/submit routes
Auto-grading service
Manual grading routes
Analytics endpoints
Phase 3: Frontend - Teacher
Exam management page
Question editor (all question types)
Exam preview
Grading interface
Analytics dashboard
Phase 4: Frontend - Student
Available exams list
Exam taking interface with timer
Question navigation
Submit & review
Results display
Key Features to Implement
Question Types
 Multiple Choice (Single Answer) - Radio buttons
 Multiple Choice (Multiple Answers) - Checkboxes
 True/False
 Fill in the Blank
 Short Answer
 Essay (Manual grading)
Auto-Grading Logic

// Single Choice: Full points if correct, 0 otherwise
// Multiple Choice: Partial credit = (correct - wrong) / total * points
// True/False: Full points if correct
// Fill-in-blank: Match against correct_answers array (case insensitive)
// Short Answer/Essay: Requires manual grading
Timer Features
Countdown display
Warning at 5 minutes
Auto-submit on timeout
Pause handling (if allowed)
Security
Tab switch detection
Copy/paste prevention (optional)
Session management
IP logging
Verification Plan
Unit Tests: Test auto-grading logic for each question type
API Tests: Test all endpoints with Postman/Thunder Client
Integration Tests: Create exam → Add questions → Student takes exam → Auto-grade → View results
Manual Testing:
Create exam with all question types
Publish and assign to class
Student takes exam with timer
Verify auto-grading accuracy
Manual grade essay questions
Check analytics accuracy