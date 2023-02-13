require("dotenv").config();

const express = require("express"),
    app = express(),
    port = process.env.PORT || 3000,
    mongoose = require("mongoose"),
    session = require("express-session"),
    passport = require("passport"),
    passportLocalMongoose = require("passport-local-mongoose"),
    MongoStore = require('connect-mongo');

app.set("view engine", "pug");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 365,
            secure: false,
        },
        store: MongoStore.create({
            mongoUrl: process.env.DB_URL,
            dbName: process.env.DB_NAME,
            autoRemove: "native"
        })
    })
);
app.use(passport.initialize());
app.use(passport.session());
mongoose.set("strictQuery", true);

mongoose.connect(process.env.DB_URL, (error) => {
    if (error) {
        console.log("Database connection: failure \n", error);
    } else {
        console.log("Database connection: success");
    }
});

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    email: { type: String, unique: true },
    password: { type: String },
});

userSchema.plugin(passportLocalMongoose, {
    usernameField: "email",
});

const User = new mongoose.model("user", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", (req, res) => {
    res.render("home", {
        status: req.isAuthenticated(),
    });
});

app.get("/authenticate", (req, res) => {
    res.render("authenticate");
});

app.post("/login", (req, res) => {
    const user = new User({
        email: req.body.email,
        password: req.body.password,
    });

    req.login(user, (error) => {
        if (error) {
            res.redirect(401, "/authenticate");
            console.log(error);
        } else {
            passport.authenticate("local")(req, res, (error) => {
                if (error) {
                    res.send(401);
                } else {
                    res.redirect("/");
                }
            });
        }
    });
});

app.post("/register", (req, res) => {
    User.register(
        { username: req.body.username, email: req.body.email },
        req.body.password,
        (error, user) => {
            if (error) {
                res.status(401).redirect("/authenticate");
                console.log(error);
            } else {
                passport.authenticate("local")(req, res, (error) => {
                    if (error) {
                        console.log(error);
                    } else {
                        res.redirect("/");
                    }
                });
            }
        }
    );
});

app.get("/logout", (req, res) => {
    req.logout((error) => {
        if (error) {
            res.send(401);
        } else {
            res.redirect("/");
        }
    });
});

app.listen(port, () =>
    console.log(`Authentication server running on http://localhost:${port}`)
);
