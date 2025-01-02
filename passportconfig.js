

const LocalStrategy = require('passport-local').Strategy;
const { Educator, Student } = require("./models/schema.js");

const intializingPassport = (passport) => {
    passport.use('Educator-local', new LocalStrategy(
        { usernameField: 'username', passwordField: 'password' },
        async (username, password, done) => {
            try {
                const user = await Educator.findOne({ username: username });
                if (!user) {
                    console.log(1);
                    return done(null, false, { message: 'Incorrect username.' });
                }
                if (!(user.password === password)) {
                    console.log(2);
                    return done(null, false, { message: 'Incorrect password.' });
                }
                return done(null, user);
            } catch (err) {
                return done(err);
            }
        }
    ));

    passport.use('Student-local', new LocalStrategy(
        { usernameField: 'username', passwordField: 'password' },
        async (username, password, done) => {
            try {
                const user = await Student.findOne({ username: username });
                if (!user) {
                    console.log(1);
                    return done(null, false, { message: 'Incorrect username.' });
                }
                if (!(user.password === password)) {
                    console.log(2);
                    return done(null, false, { message: 'Incorrect password.' });
                }
                return done(null, user);
            } catch (err) {
                return done(err);
            }
        }
    ));

    passport.serializeUser((user, done) => {
        done(null, { id: user.id, role: user.role });
    });

    passport.deserializeUser(async ({ id, role }, done) => {
        try {
            let user;
            if (role === 'Educator') {
                user = await Educator.findById(id);
            } else {
                user = await Student.findById(id);
            }
            done(null, user);
        } catch (err) {
            done(err, false);
        }
    });
};

module.exports = { intializingPassport };
