const express = require('express');
const router = express.Router();
const passport = require('passport');
const { Student, Exam,StudentDetails ,ExamAttempt} = require('../models/schema.js');

// Middleware for authentication
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next(); 
    }
    res.status(401).redirect('/');
};

router.get('/search/:user_id/:Exam_id', isAuthenticated, async (req, res) => {
  const examId = req.params.Exam_id;
  const studentId = req.params.user_id;

  try {
      // Find the exam using the correct field name 'Exam_id'
      const exam = await Exam.findOne({ Exam_id: examId });
      if (!exam) {
          return res.status(404).json({ message: "Exam not found" });
      }

      // Check if the student has already attempted this exam
      const userAttempt = await ExamAttempt.findOne({ student: studentId, exam_id: examId });

      // Check if the student has exhausted attempts
      if (userAttempt) {
          if (userAttempt.attempt_no >= exam.maxAttempts) {
              return res.status(403).json({ message: "Attempt limit exceeded for this exam." });
          }
      }

      return res.status(200).json({ message: "Exam found", exam: exam,attemptsRemaining: userAttempt ? (exam.maxAttempts - userAttempt.attempt_no) : exam.maxAttempts });
      
  } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
  }
});

router.post('/submit', isAuthenticated, async (req, res) => {
  const { studentId, examId, answers, timeSpent } = req.body;

  try {
      const student_name = await Student.findOne({ _id:studentId });

      
      const exam = await Exam.findOne({ Exam_id: examId });
      if (!exam) {
          return res.status(404).json({ error: 'Exam not found' });
      }

      // Calculate score
      let score = 0;
      for (let i = 0; i < exam.questions.length; i++) {
          if (answers[i] && answers[i] === exam.questions[i].correctAnswer) {
            score += exam.questions[i].marks; // Add question's marks to score if correct
          }
          
      }

      // Check if an attempt already exists for this student and exam
      const existingAttempt = await ExamAttempt.findOne({ student: studentId, exam_id: examId });
      if (existingAttempt) {
          // Increment attempt number and update score and status
          existingAttempt.attempt_no += 1;
          existingAttempt.score = score; // Optionally update the score
          existingAttempt.status = 'completed'; 
          existingAttempt.timeSpent=timeSpent ,
          existingAttempt.markedOptions=answers;// Update status
          await existingAttempt.save();
          return res.status(200).json({ message: 'Submission successful', score, redirect: `/Login/Student/${student_name.username}`});
      }

      // Create a new exam attempt if none exists
      const examAttempt = new ExamAttempt({
          student: studentId,
          exam_id: examId,
          score,
          status: 'completed',
          markedOptions:answers,
          timeSpent:timeSpent ,
          attempt_no: 1 // First attempt
      });

      await examAttempt.save();
      return res.status(200).json({ message: 'Submission successful', score, redirect: `/Login/Student/${student_name.username}`});

  } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'An error occurred during submission' });
  }
});


// Route to handle POST request for starting the exam
router.post('/start/:id/:examId',  isAuthenticated,async (req, res) => {
  const examId = req.params.examId;
  const userId = req.params.id; 
  try {
    const exam = await Exam.findOne({ Exam_id: examId });

    if (!exam) {
      return res.status(404).send({ message: 'Exam not found' });
      
    }
    else{
      var secureExamData = {
        Exam_id: exam.Exam_id,
        exam_name: exam.exam_name,
        timeLimit: exam.timeLimit,
        questions: exam.questions.map(q => ({
          questionText: q.questionText,
          options: q.options.map(option => ({
            optionText: option // Since options are strings
          }))
          // Correct answer is not included here
        }))
      };
      
    }
    const student = await Student.findById(userId); 
    if (!student) {
      return res.status(404).send({ message: 'Student not found' });
    }
    let title=exam.title;
    res.render("Exam_start.ejs",{exam:secureExamData ,student,title });

  } catch (error) {
    console.error('Error starting the exam:', error);
    return res.status(500).send({ message: 'An error occurred while starting the exam.' });
  }
});

router.post('//:id/:examId',  isAuthenticated,async (req, res) => {
  const examId = req.params.examId;
  const userId = req.params.id; 
  try {
    const exam = await Exam.findOne({ Exam_id: examId });

    if (!exam) {
      return res.status(404).send({ message: 'Exam not found' });
      
    }
    else{
      var secureExamData = {
        Exam_id: exam.Exam_id,
        exam_name: exam.exam_name,
        timeLimit: exam.timeLimit,
        questions: exam.questions.map(q => ({
          questionText: q.questionText,
          options: q.options.map(option => ({
            optionText: option // Since options are strings
          }))
          // Correct answer is not included here
        }))
      };
      
    }
    const student = await Student.findById(userId); 
    if (!student) {
      return res.status(404).send({ message: 'Student not found' });
    }
    let title=exam.title;
    res.render("Exam_start.ejs",{exam:secureExamData ,student,title });

  } catch (error) {
    console.error('Error starting the exam:', error);
    return res.status(500).send({ message: 'An error occurred while starting the exam.' });
  }
});


router.get('/Result/:studentId/:examId', isAuthenticated,async (req, res) => {
  console.log("hello");
  try {
      const { studentId, examId } = req.params;
      // Fetch the latest exam attempt
      const latestAttempt = await ExamAttempt.findOne({
          student: studentId,
          exam_id: examId
      });

      if (!latestAttempt) {
          return res.status(404).render('error', { 
              message: 'No attempt found for this exam',
              error: { status: 404 }
          });
      }

      // Fetch exam details
      const exam = await Exam.findOne({ Exam_id: examId });
      if (!exam) {
          return res.status(404).render('error', { 
              message: 'Exam not found',
              error: { status: 404 }
          });
      }

      // Fetch student details
      const student = await Student.findById(studentId);

      // Analyze question-wise performance
      const questionAnalysis = exam.questions.map((question, index) => {
          const markedOption = latestAttempt.markedOptions[index];
          
          return {
              questionNo: index + 1,
              questionText: question.questionText,
              marks: question.marks,
              correctAnswer: question.correctAnswer,
              markedAnswer: markedOption || 'Not Attempted',
              isCorrect: markedOption === question.correctAnswer,
              options: question.options
          };
      });

      // Calculate performance metrics
      const correctQuestions = questionAnalysis.filter(q => q.isCorrect).length;
      const incorrectQuestions = questionAnalysis.filter(q => ((q.markedAnswer!='Not Attempted') && !q.isCorrect)).length;
      const unattemptedQuestions = questionAnalysis.filter(q => (q.markedAnswer=='Not Attempted')).length;

      // Prepare analysis data
      const analysisData = {
          student_id:student._id,
          examTitle: exam.title,
          studentName: student.username,
          attempt: {
              number: latestAttempt.attempt_no,
              date: latestAttempt.dateAttempted,
              timeTaken: latestAttempt.timeSpent || 'Not recorded',
              score: latestAttempt.score,
              status: latestAttempt.status
          },
          examDetails: {
              totalQuestions: exam.questions.length,
              totalMarks: exam.totalScore,
              timeLimit: exam.timeLimit
          },
          performance: {
              correctQuestions,
              incorrectQuestions,
              unattemptedQuestions,
              percentageScore: ((latestAttempt.score / exam.totalScore) * 100).toFixed(2)
          },
          questionAnalysis
      };
      res.render('result', {
          title: `Exam Analysis - ${exam.title}`,
          analysisData
      });

  } catch (error) {
      console.error('Error in exam analysis:', error);
      res.status(500).render('error', {
          message: 'Error generating analysis',
          error
      });
  }
});

module.exports = router;


