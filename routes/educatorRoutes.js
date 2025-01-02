const express = require('express');
const router = express.Router();
const { Educator, EducatorDetails,ExamAttempt, Exam } = require('../models/schema.js');

// Middleware for authentication
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).redirect('/'); // Redirect to home if not authenticated
};
async function getExamsCreatedThisYear(username) {
    // Get the current year
    const currentYear = new Date().getFullYear();

    // Define the start and end of the year
    const startOfYear = new Date(currentYear, 0, 1);  // January 1st of current year
    const endOfYear = new Date(currentYear + 1, 0, 1); // January 1st of next year

    try {
        // Query exams created within the start and end of the current year
        const exams = await Exam.find({
            createdAt: {
                $gte: startOfYear,
                $lt: endOfYear
            },
            createdBy: username
        });
        
        return exams.length;
    } catch (error) {
        console.error("Error fetching exams for the current year:", error);
    }
}

async function getTotalQuestionsOverall(username) {
    try {
        const exams = await Exam.aggregate([
            {
                $match: { createdBy: username } 
            },
            {
                $project: {
                    questionCount: { $size: "$questions" } // Count the number of questions in each exam
                }
            },
            {
                $group: {
                    _id: null,
                    totalQuestions: { $sum: "$questionCount" } // Sum up question counts across filtered exams
                }
            }
        ]);

        const totalQuestions = exams.length > 0 ? exams[0].totalQuestions : 0;
        return totalQuestions;
    } catch (error) {
        console.error("Error calculating total questions overall:", error);
        return 0;
    }
}
async function getTotalStudentEngagementByExam(educatorName) {
    try {
        const result = await Exam.aggregate([
            {
                $match: {
                    createdBy: educatorName // Filter exams by the current educator
                }
            },
            {
                $lookup: {
                    from: "examattempts", // Collection name for exam attempts
                    localField: "Exam_id",
                    foreignField: "exam_id",
                    as: "attempts" // Store related attempts in an array
                }
            },
            {
                $project: {
                    Exam_id: 1,
                    totalStudentsEngaged: { $size: "$attempts" } // Count number of attempts per exam
                }
            }
        ]);

        return result;
    } catch (error) {
        console.error("Error calculating total student engagement per exam:", error);
    }
}
router.get('/:id', isAuthenticated, async (req, res) => {
    const user = await Educator.findOne({ _id: req.params.id });
try {       
    // Fetch educator and related details
    const educatorDetails = await EducatorDetails.findOne({ educatorName: user.username });
    if(!educatorDetails){
        return res.render('./profile_pages/educator_note.ejs', { user_n:user.username});
    }
    const exams = await Exam.find({ createdBy: user.username });
    const exam_count = await getExamsCreatedThisYear(user.username);
    const t_ques = await getTotalQuestionsOverall(user.username);
    const students_engaged = await getTotalStudentEngagementByExam(user.username);
    
    // Calculate total students engaged
    let t = 0;
    for (let i = 0; i < students_engaged.length; i++) {
        t += students_engaged[i].totalStudentsEngaged;
    }
    // Render profile page with data
    return res.render('./profile_pages/educator_profile.ejs', {
        educatorDetails,
        user,
        exams,
        total_exams: exams.length,
        this_year_count: exam_count,
        t_ques,
        stu_engaged: t
    });
} catch (error) {
    console.error(error);
    res.status(500).send('Error fetching educator details or exam attempts');
}
});
router.get('/:id/graph_data',isAuthenticated, async (req, res) => {
    try {
        // First find the educator to get their username
        const educator = await Educator.findOne({ _id: req.params.id });
        if (!educator) {
            return res.status(404).json({ message: "Educator not found" });
        }

        // Find exams created by the educator and group by creation period
        const examsCreatedData = await Exam.aggregate([
            { 
                $match: { 
                    createdBy: educator.username // Use username instead of ID
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { 
                $sort: { "_id": 1 }
            }
        ]);

        // Format data for frontend
        const graphData = examsCreatedData.map(item => ({
            period: item._id,
            count: item.count
        }));

        res.json({ data: graphData });
    } catch (error) {
        console.error("Error fetching graph data:", error);
        res.status(500).json({ message: "Error fetching graph data" });
    }
});

router.post('/Exam_Create', isAuthenticated, async (req, res) => {
    console.log(req.body);
    try {
        // Create a new Exam object
        const newExam = new Exam({
            Exam_id: req.body.Exam_id,
            title: req.body.title,
            course: req.body.course,
            createdBy: req.body.createdBy,
            questions: req.body.questions,
            timeLimit: req.body.timeLimit,
            maxAttempts: req.body.maxAttempts,
            totalScore: req.body.totalScore
        });

        // Save the new exam to the database
        await newExam.save();        // Find the educator's details
        const educator = await Educator.findOne({ username: req.body.createdBy });
        if (!educator) {
            return res.status(404).json({ error: "Educator not found" });
        }
        res.status(201).json({ message: "Exam created successfully", educatorId: educator._id });

    } catch (error) {
        // Log the error for debugging
        console.error("Error creating exam:", error);
        // Send a structured error response
        return res.status(500).json({ error: "Error creating exam" });
    }
});

router.get('/check_details/:username', isAuthenticated, async (req, res) =>{
    try {
        const edu_Name = req.params.username;
        const educator = await EducatorDetails.findOne({ educatorName:edu_Name });
        const educator_t = await Educator.findOne({ username:edu_Name  });
        if (educator) {
            return res.render('create_exam.ejs', {id:educator_t._id, user:edu_Name});
        } else {
            console.log
            return res.render('details/educator.ejs', { educatorName:edu_Name });
        }
    } catch (error) {
        console.error("Error checking educator details: ", error);
        return res.status(500).send("Server Error");
    }
});
router.post('/save_details',isAuthenticated, async (req, res) => {
    try {
        // Extracting details from request body
        const {
            educatorName,
            email,
            subjectExpertise,
            highestLevelOfEducation,
            experience
        } = req.body;

        // Creating a new Educator document
        const newEducator = new EducatorDetails({
            educatorName,
            email,
            subjectExpertise,
            highestLevelOfEducation,
            experience
        });

        // Saving the document in the database
        await newEducator.save();
        const educator_t = await Educator.findOne({ username: educatorName});
        return res.render('create_exam.ejs', {id:educator_t._id, user:educatorName});
    } catch (error) {
        console.error(error);
        res.status(400).send({ error: error.message });
    }
});

module.exports = router;

