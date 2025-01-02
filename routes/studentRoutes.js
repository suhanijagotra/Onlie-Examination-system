const express = require('express');
const router = express.Router();
const passport = require('passport');
const { Student, StudentDetails ,ExamAttempt} = require('../models/schema.js');

// Middleware for authentication
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next(); 
    }
    res.status(401).redirect('/');
};

router.get('/:id',isAuthenticated, async (req, res) => {
    const user = await Student.findOne({ _id: req.params.id });

    try {       // Fetch student details
        const studentDetails = await StudentDetails.findOne({ studentName: user.username });

        if(!studentDetails){
            return res.render('./profile_pages/student_note.ejs', { user_n:user.username});
        }
    
        const examAttempts = await ExamAttempt.find({ student: req.params.id });
        const size=examAttempts.length;
        res.render('./profile_pages/student_profile.ejs',{ studentDetails, examAttempts,size ,user_id:user._id});
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching student details or exam attempts');
    }
});

router.get('/:id/graph_data', isAuthenticated, async (req, res) => {
    const user = await Student.findOne({ _id: req.params.id });

    try {
        // Fetch student details
        const studentDetails = await StudentDetails.findOne({ studentName: user.username });

        // Aggregate exam attempts by quarters
        const examStats = await ExamAttempt.aggregate([
            // Match documents for the specific student and completed status
            {
                $match: {
                    student: req.params.id,
                    status: "completed"
                }
            },
            // Group by quarters
            {
                $group: {
                    _id: {
                        year: { $year: "$dateAttempted" },
                        quarter: {
                            $ceil: { $divide: [{ $month: "$dateAttempted" }, 3] }
                        }
                    },
                    count: { $sum: 1 },
                    // Store the period start date for sorting
                    periodStart: {
                        $min: "$dateAttempted"
                    }
                }
            },
            // Sort by date
            {
                $sort: {
                    "periodStart": 1
                }
            },
            // Format the output
            {
                $project: {
                    _id: 0,
                    period: {
                        $concat: [
                            { $toString: "$_id.year" },
                            "-",
                            {
                                $switch: {
                                    branches: [
                                        { case: { $eq: ["$_id.quarter", 1] }, then: "T1" },
                                        { case: { $eq: ["$_id.quarter", 2] }, then: "T2" },
                                        { case: { $eq: ["$_id.quarter", 3] }, then: "T3" },
                                        { case: { $eq: ["$_id.quarter", 4] }, then: "T4" }
                                    ]
                                }
                            }
                        ]
                    },
                    count: 1,
                    periodStart: 1
                }
            }
        ]);

        res.json({
            status: 'success',
            data: examStats,
            student: studentDetails
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: 'error',
            message: 'Error fetching student details or exam attempts',
            error: error.message
        });
    }
});
router.get('/check_details/:user_name', isAuthenticated, async (req, res) => {
    try {
        const studentName = req.params.user_name;
        const student = await StudentDetails.findOne({ studentName: studentName });
        if (student) {
            // If student exists, render the give_exam.ejs view
            const user = await Student.findOne({ username:studentName });
            return res.render('../views/give_exam.ejs', { user });
        } else {

            return res.render('../views/details/student.ejs',{ studentName });
        }
    } catch (error) {
        console.error("Error checking student details: ", error);
        return res.status(500).send("Server Error");
    }
});

// POST route to save student details
router.post('/save_details', async (req, res) => {
    const { studentName, email, currentLevelOfEducation, instituteName } = req.body;
    const newStudent = new StudentDetails({
        studentName,
        email,
        currentLevelOfEducation,
        instituteName,
    });

    try {
        await newStudent.save();
        const user = await Student.findOne({ username:studentName });
        // Send response indicating success
        return res.render('../views/give_exam.ejs', { user});
    } catch (error) {
        console.error(error);
        return res.status(500).send('Error saving student details.'); // Ensure to send only one response
    }
});

module.exports = router;

