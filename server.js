const express = require('express');
const app = express();
const path = require("path");
const passport = require('passport');
const expressSession = require("express-session");


const { connectMongoose } = require('./models/schema.js');
const { intializingPassport } = require("./passportconfig.js");


// Connect to the database
connectMongoose();

// Middleware setup
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(expressSession({ secret: "hello", resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

intializingPassport(passport);

// Set up view engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Import routes
const studentRoutes = require('./routes/studentRoutes');
const educatorRoutes = require('./routes/educatorRoutes');
const signupRoutes = require('./routes/signupRoutes.js');
const loginRoutes = require('./routes/loginRoutes.js');
const examRoutes = require('./routes/examRoutes.js');

// Use routes
app.use('/Student', studentRoutes);
app.use('/Educator', educatorRoutes);
app.use('/Signup', signupRoutes);
app.use('/Login',loginRoutes);
app.use('/Exam',examRoutes);
// Default route
app.get("/", (req, res) => {
    res.render("index.ejs");
});

// Start the server
app.listen(8000, () => {
    console.log("Server started successfully on port 8000");
});


