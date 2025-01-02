const mongoose = require('mongoose');

// Function to connect to the MongoDB database
const connectMongoose = async () => {
    try {
        await mongoose.connect("mongodb://localhost:27017/minor_project", {});
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("Error connecting to MongoDB", error);
    }
};

const educatorSchema = new mongoose.Schema({
    name: String,
    username: {
        type: String,
        required: true,
        unique: true
    },
    role: {
        type: String,
        required: true,
        default: 'Educator' 
    },
    password: {
        type: String,
        required: true
    }
});

const studentSchema = new mongoose.Schema({
    name: String,
    username: {
        type: String,
        required: true,
        unique: true
    },
    role: {
        type: String,
        required: true,
        default: 'Student' // Ensures role is always 'Student'
    },
    password: {
        type: String,
        required: true
    }
});

const educatorDetailsSchema = new mongoose.Schema({
    educatorName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    subjectExpertise: {
      type: String,
      required: true,
      trim: true
    },
    highestLevelOfEducation: {
      type: String,
      required: true,
      trim: true
    },
    experience: {
      type: Number,
      required: true,
      min: 0
    }
}, {
    timestamps: true
});

const studentDetailsSchema = new mongoose.Schema({
    studentName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    currentLevelOfEducation: {
        type: String,
        required: true,
        trim: true
    },
    instituteName: {
        type: String,
    }
}, {
    timestamps: true
});

// New Exam Schema
const examSchema = new mongoose.Schema({
    Exam_id: { 
        type: String, 
        required: true,
        validate: {
            validator: function(v) {
                return /^\d{4}$/.test(v); // Ensure it is a 4-digit string
            },
            message: props => `${props.value} is not a valid 4-digit Exam ID!`
        }
    },
    title: { type: String, required: true },
    course: { type: String, required: true },
    createdBy: { type: String, required: true }, // Store educator's name or ID as a string
    questions: [{
        questionText: String,
        options: [String],
        correctAnswer: String,
        marks: Number
    }],
    timeLimit: { 
        type: Number, 
        default: 30 // Default to 30 minutes
    },
    maxAttempts: {
        type: Number,
        default: 1 // Default to 1 attempt
    },

    totalScore: { type: Number },

}, {
    timestamps: true // Automatically add createdAt and updatedAt fields
});

const examAttemptSchema = new mongoose.Schema({
    student: { type: String, required: true }, // Store student ID or name as a string
    exam_id: { type: String, required: true }, // Store exam ID or title as a string
    score: { type: Number },
    dateAttempted: { type: Date, default: Date.now },
    status: { 
        type: String, 
        enum: ['stopped', 'completed', 'not_attempted'], // Valid statuses
        default: 'not_attempted' 
    },
    attempt_no: { type: Number,  default:0 },
    markedOptions: { 
        type: [String], // Array of numbers to store the marked options (e.g., [-1])
        default: ["Not_attempted"] // Default is [-1]
    }
    ,
    timeSpent: { 
        min:Number,
        sec:Number
        }
}, {
    timestamps: true // Automatically adds createdAt and updatedAt
});


// Models
const Educator = mongoose.model('Educator', educatorSchema);
const Student = mongoose.model('Student', studentSchema);
const EducatorDetails = mongoose.model('EducatorDetails', educatorDetailsSchema);
const StudentDetails = mongoose.model('StudentDetails', studentDetailsSchema);
const Exam = mongoose.model('Exam', examSchema);
const ExamAttempt = mongoose.model('ExamAttempt', examAttemptSchema);



module.exports = { connectMongoose, Educator, Student, EducatorDetails, StudentDetails, Exam, ExamAttempt };
