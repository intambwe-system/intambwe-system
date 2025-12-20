const { Marks, Student, Subject, Class, Trade, Employee, ClassSubject } = require('../../model');
const { Op } = require('sequelize');

const reportController = {
  /**
   * Get comprehensive student assessment report with position ranking
   * GET /api/report/student/:std_id/assessment
   * Query params: ac_year (required)
   */
  async getStudentAssessmentReport(req, res) {
    try {
      const { std_id } = req.params;
      const { ac_year } = req.query;

      // Validate inputs
      if (!std_id || isNaN(std_id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid student ID'
        });
      }

      if (!ac_year) {
        return res.status(400).json({
          success: false,
          message: 'Academic year is required'
        });
      }

      // Fetch student with class and trade info
      const student = await Student.findByPk(std_id, {
        include: [
          {
            model: Class,
            include: [
              { model: Trade , as:'Trade' },
              { model: Employee, as: 'classTeacher' }
            ]
          }
        ]
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      if (!student.class_id) {
        return res.status(400).json({
          success: false,
          message: 'Student is not assigned to any class'
        });
      }

      // Fetch student's marks for the academic year
      const studentMarks = await Marks.findAll({
        where: {
          std_id: std_id,
          ac_year: ac_year
        },
   include: [
  { 
    model: Subject,
    attributes: ['sbj_id', 'sbj_code', 'sbj_name', 'category_type'],
    include: [
      {
        model: ClassSubject,
        attributes: ['credit', 'total_max'],
        where: student.class_id ? { class_id: student.class_id } : undefined,
        required: false
      }
    ]
  }
],
        order: [['semester', 'ASC']]
      });

      // Process marks into structured format
      const processedSubjects = processStudentMarks(studentMarks);

      // Get all students in the same class
      const classStudents = await Student.findAll({
        where: {
          class_id: student.class_id,
          std_status: 'Active'
        },
        attributes: ['std_id', 'std_fname', 'std_lname', 'admission_number']
      });

      // Calculate semester rankings and totals
      const semesterRankings = await calculateSemesterRankings(
        classStudents,
        ac_year,
        std_id,
        processedSubjects
      );

      // Calculate overall statistics
      const overallStats = calculateOverallStats(processedSubjects);

      // Calculate overall position/ranking
      const overallRanking = await calculateClassRanking(
        classStudents,
        ac_year,
        std_id,
        overallStats.overallAverage
      );

      // Prepare response
      const report = {
        student: {
          std_id: student.std_id,
          std_fname: student.std_fname,
          std_mname: student.std_mname,
          std_lname: student.std_lname,
          admission_number: student.admission_number,
          std_image: student.std_image,
          Class: student.Class
        },
        academicYear: ac_year,
        subjects: processedSubjects,
        semesterResults: semesterRankings.semesterResults,
        overallStatistics: {
          totalMarks: overallStats.totalMarks,
          overallAverage: overallStats.overallAverage,
          totalCredits: overallStats.totalCredits,
          subjectCount: processedSubjects.length
        },
        overallRanking: {
          position: overallRanking.position,
          totalStudents: overallRanking.totalStudents,
          percentile: overallRanking.percentile
        },
        categories: categorizeSubjects(processedSubjects)
      };

      return res.status(200).json({
        success: true,
        data: report
      });

    } catch (error) {
      console.error('Error generating assessment report:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  /**
   * Get class ranking for all students
   * GET /api/report/class/:class_id/ranking
   * Query params: ac_year (required)
   */
  async getClassRanking(req, res) {
    try {
      const { class_id } = req.params;
      const { ac_year } = req.query;

      if (!class_id || isNaN(class_id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid class ID'
        });
      }

      if (!ac_year) {
        return res.status(400).json({
          success: false,
          message: 'Academic year is required'
        });
      }

      // Get all students in the class
      const students = await Student.findAll({
        where: {
          class_id: class_id,
          std_status: 'Active'
        },
        attributes: ['std_id', 'std_fname', 'std_mname', 'std_lname', 'admission_number', 'std_image']
      });

      if (students.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No students found in this class'
        });
      }

      // Calculate averages for all students
      const studentRankings = [];

      for (const student of students) {
        const marks = await Marks.findAll({
          where: {
            std_id: student.std_id,
            ac_year: ac_year
          },
         
include: [
  { 
    model: Subject,
    attributes: ['sbj_id', 'sbj_code', 'sbj_name', 'category_type'],
    include: [
      {
        model: ClassSubject,
        attributes: ['credit', 'total_max'],
        where: student.class_id ? { class_id: student.class_id } : undefined,
        required: false
      }
    ]
  }
]
        });

        const processedSubjects = processStudentMarks(marks);
        const stats = calculateOverallStats(processedSubjects);

        studentRankings.push({
          std_id: student.std_id,
          std_fname: student.std_fname,
          std_mname: student.std_mname,
          std_lname: student.std_lname,
          admission_number: student.admission_number,
          std_image: student.std_image,
          totalMarks: stats.totalMarks,
          overallAverage: stats.overallAverage,
          totalCredits: stats.totalCredits,
          subjectCount: processedSubjects.length
        });
      }

      // Sort by overall average (descending)
      studentRankings.sort((a, b) => b.overallAverage - a.overallAverage);

      // Assign positions
      studentRankings.forEach((student, index) => {
        student.position = index + 1;
        student.percentile = ((studentRankings.length - index) / studentRankings.length * 100).toFixed(1);
      });

      return res.status(200).json({
        success: true,
        data: {
          class_id: parseInt(class_id),
          ac_year: ac_year,
          totalStudents: studentRankings.length,
          rankings: studentRankings
        }
      });

    } catch (error) {
      console.error('Error generating class ranking:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
};

// Helper function to process student marks


// Helper function to calculate overall statistics
function calculateOverallStats(subjects) {
  let totalMarks = 0;
  let totalCredits = 0;
  let subjectCount = 0;

  subjects.forEach(subject => {
    const termValues = Object.values(subject.terms).map(t => parseFloat(t.avg));
    if (termValues.length > 0) {
      const annualAvg = termValues.reduce((a, b) => a + b, 0) / termValues.length;
      totalMarks += annualAvg;
      totalCredits += subject.credits || 0;
      subjectCount++;
    }
  });

  const overallAverage = subjectCount > 0 ? (totalMarks / subjectCount) : 0;

  return {
    totalMarks: parseFloat(totalMarks.toFixed(1)),
    overallAverage: parseFloat(overallAverage.toFixed(1)),
    totalCredits: totalCredits,
    subjectCount: subjectCount
  };
}

// Helper function to calculate semester rankings and totals
async function calculateSemesterRankings(classStudents, ac_year, current_std_id, processedSubjects) {
  // Get all unique semesters from the processed subjects
  const semestersSet = new Set();
  processedSubjects.forEach(subject => {
    Object.keys(subject.terms).forEach(term => semestersSet.add(term));
  });
  const semesters = Array.from(semestersSet).sort();

  const semesterResults = [];

  // Calculate for each semester
  for (const semester of semesters) {
    // Calculate current student's semester total
    const studentSemesterData = calculateSemesterTotal(processedSubjects, semester);

    // Calculate all students' totals for this semester
    const allStudentTotals = [];
    
    for (const student of classStudents) {
      try {
        const marks = await Marks.findAll({
          where: {
            std_id: student.std_id,
            ac_year: ac_year,
            semester: semester
          },
   include: [
  { 
    model: Subject,
    attributes: ['sbj_id', 'sbj_code', 'sbj_name', 'category_type'],
    include: [
      {
        model: ClassSubject,
        attributes: ['credit', 'total_max'],
        where: student.class_id ? { class_id: student.class_id } : undefined,
        required: false
      }
    ]
  }
],
        });

        const studentSubjects = processStudentMarks(marks);
        const semesterTotal = calculateSemesterTotal(studentSubjects, semester);

        allStudentTotals.push({
          std_id: student.std_id,
          total: semesterTotal.totalMarks,
          percentage: semesterTotal.percentage
        });
      } catch (error) {
        console.error(`Error processing student ${student.std_id} for ${semester}:`, error);
        allStudentTotals.push({
          std_id: student.std_id,
          total: 0,
          percentage: 0
        });
      }
    }

    // Sort by percentage (descending)
    allStudentTotals.sort((a, b) => b.percentage - a.percentage);

    // Find current student's position
    const position = allStudentTotals.findIndex(s => s.std_id === parseInt(current_std_id)) + 1;
    const totalStudents = allStudentTotals.length;
    const percentile = totalStudents > 0 ? 
      parseFloat(((totalStudents - position + 1) / totalStudents * 100).toFixed(1)) : 0;

    semesterResults.push({
      semester: semester,
      totalMarks: studentSemesterData.totalMarks,
      maxMarks: studentSemesterData.maxMarks,
      percentage: studentSemesterData.percentage,
      subjectCount: studentSemesterData.subjectCount,
      ranking: {
        position: position || null,
        totalStudents: totalStudents,
        percentile: percentile
      }
    });
  }

  return { semesterResults };
}

// Helper function to calculate semester total
// Helper function to process student marks
function processStudentMarks(marks) {
  const subjectMap = new Map();


  

  marks.forEach(mark => {
    if (!mark.Subject) return;

    const key = mark.Subject.sbj_code;

   if (!subjectMap.has(key)) {
  const classSubject = mark.Subject.ClassSubjects?.[0];

  subjectMap.set(key, {
    sbj_id: mark.Subject.sbj_id,
    code: mark.Subject.sbj_code,
    title: mark.Subject.sbj_name,
    credits: classSubject ? classSubject.credit : 0,
    totalMax: classSubject ? classSubject.total_max : 100,
    category: mark.Subject.category_type || 'GENERAL',
    terms: {}
  });
}


    const subject = subjectMap.get(key);
    const termKey = mark.semester || 'Semester 1';

    // Calculate FA (Formative Assessment) - normalized to 100%
    let fa = null;
    if (mark.FA && Array.isArray(mark.FA) && mark.FA.length > 0) {
      const normalizedScores = mark.FA.map(assessment => {
        const score = parseFloat(assessment.score) || 0;
        const maxScore = parseFloat(assessment.maxScore) || 1;
        return (score / maxScore) * 100;
      });
      fa = normalizedScores.reduce((sum, score) => sum + score, 0) / normalizedScores.length;
    }

    // Calculate IA (Integrated Assessment) - normalized to 100%
    let la = null;
    if (mark.IA && Array.isArray(mark.IA) && mark.IA.length > 0) {
      const normalizedScores = mark.IA.map(assessment => {
        const score = parseFloat(assessment.score) || 0;
        const maxScore = parseFloat(assessment.maxScore) || 1;
        return (score / maxScore) * 100;
      });
      la = normalizedScores.reduce((sum, score) => sum + score, 0) / normalizedScores.length;
    }

    // Calculate CA (Comprehensive Assessment) - normalized to 100%
    let ca = null;
    const caScore = parseFloat(mark.CA_score || 0);
    const caMaxScore = parseFloat(mark.CA_maxScore || 0);
    if (caMaxScore > 0) {
      ca = (caScore / caMaxScore) * 100;
    }

    // Calculate average for this term (only include non-null values)
    const scores = [fa, la, ca].filter(score => score !== null);
    const avg = scores.length > 0 
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
      : null;

    subject.terms[termKey] = {
      fa: fa !== null ? fa.toFixed(1) : null,
      la: la !== null ? la.toFixed(1) : null,
      ca: ca !== null ? ca.toFixed(1) : null,
      avg: avg !== null ? avg.toFixed(1) : null
    };
  });

  return Array.from(subjectMap.values());
}

// Helper function to calculate overall statistics
function calculateOverallStats(subjects) {
  let totalMarks = 0;
  let totalCredits = 0;
  let subjectCount = 0;

  subjects.forEach(subject => {
    const termValues = Object.values(subject.terms)
      .map(t => t.avg !== null ? parseFloat(t.avg) : null)
      .filter(avg => avg !== null);
    
    if (termValues.length > 0) {
      const annualAvg = termValues.reduce((a, b) => a + b, 0) / termValues.length;
      totalMarks += annualAvg;
      totalCredits += subject.credits || 0;
      subjectCount++;
    }
  });

  const overallAverage = subjectCount > 0 ? (totalMarks / subjectCount) : 0;

  return {
    totalMarks: parseFloat(totalMarks.toFixed(1)),
    overallAverage: parseFloat(overallAverage.toFixed(1)),
    totalCredits: totalCredits,
    subjectCount: subjectCount
  };
}



// Helper function to calculate semester total
function calculateSemesterTotal(subjects, semester) {
  let totalMarks = 0;
  let subjectCount = 0;

  subjects.forEach(subject => {
    if (subject.terms[semester] && subject.terms[semester].avg !== null) {
      const avg = parseFloat(subject.terms[semester].avg);
      totalMarks += avg;
      subjectCount++;
    }
  });

  const maxMarks = subjectCount * 100; // Each subject is out of 100
  const percentage = maxMarks > 0 ? (totalMarks / maxMarks) * 100 : 0;

  return {
    totalMarks: parseFloat(totalMarks.toFixed(1)),
    maxMarks: maxMarks,
    percentage: parseFloat(percentage.toFixed(1)),
    subjectCount: subjectCount
  };
}

// Helper function to calculate class ranking
async function calculateClassRanking(classStudents, ac_year, current_std_id, currentAverage) {
  const studentAverages = [];

  for (const student of classStudents) {
    try {
      const marks = await Marks.findAll({
        where: {
          std_id: student.std_id,
          ac_year: ac_year
        },
           include: [
  { 
    model: Subject,
    attributes: ['sbj_id', 'sbj_code', 'sbj_name', 'category_type'],
    include: [
      {
        model: ClassSubject,
        attributes: ['credit', 'total_max'],
        where: student.class_id ? { class_id: student.class_id } : undefined,
        required: false
      }
    ]
  }
],
      });

      const processedSubjects = processStudentMarks(marks);
      const stats = calculateOverallStats(processedSubjects);

      studentAverages.push({
        std_id: student.std_id,
        average: stats.overallAverage
      });
    } catch (error) {
      console.error(`Error processing student ${student.std_id}:`, error);
      studentAverages.push({
        std_id: student.std_id,
        average: 0
      });
    }
  }

  // Sort by average (descending)
  studentAverages.sort((a, b) => b.average - a.average);

  // Find current student's position
  const position = studentAverages.findIndex(s => s.std_id === parseInt(current_std_id)) + 1;
  const totalStudents = studentAverages.length;
  const percentile = totalStudents > 0 ? 
    parseFloat(((totalStudents - position + 1) / totalStudents * 100).toFixed(1)) : 0;

  return {
    position: position || null,
    totalStudents: totalStudents,
    percentile: percentile
  };
}

// Helper function to categorize subjects
function categorizeSubjects(subjects) {
  return {
    coreSpecific: subjects.filter(s => s.category === 'CORE'),
    coreGeneral: subjects.filter(s => s.category === 'GENERAL'),
    complementary: subjects.filter(s => s.category === 'COMPLEMENTARY')
  };
}

module.exports = reportController;