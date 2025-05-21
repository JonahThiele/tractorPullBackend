const express = require('express')
const sql = require('./sql.js')
const app = express()
const port = 3000

const passport = require('passport')
const session = require('express-session')
const cookies = require('cookie-parser')

const LocalStrategy = require('passport-local').Strategy
const bodyParser = require('body-parser')
app.use(bodyParser.json())

const crypto = require('crypto')
const env = require('dotenv')
env.config()

const cors = require('cors');

// CORS options
const corsOptions = {
    origin: 'tractorpullbackend-exhybafjf4agh7bz.canadacentral-01.azurewebsites.net', 
    credentials: true,    
    methods: ['GET', 'POST'],
};

app.use(cors(corsOptions));
app.use(express.json())
app.use(express.urlencoded({extended: false}))
// app.use(cors())
app.use(cookies())
//we need to lock this down to https and decrease the max age of the cookie
//other than that it should work for basic auth
app.use(session({
    secret: process.env.TOKEN_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        httpOnly: true,
        //wonder if I can force this for a certain port another way, later on this should be connected to the azure deploy
        domain: "tractorpullbackend-exhybafjf4agh7bz.canadacentral-01.azurewebsites.net",
        //path: '/',
        maxAge: 1000 * 60 * 60 * 24,
        sameSite: 'Lax',
    }
}))

app.use(passport.initialize())
app.use(passport.session())

app.use(passport.authenticate('session'))

//setting up passport authenication
passport.use(new LocalStrategy(function verify(username, password, cb) {
    sql.get_recorder(username).then( value => {
        //username not in the database
        //maybe we should put up a pretense of handling other errors as well
        if(value === undefined)
        {
            return cb(null, false, {message: 'Incorrect username or password.'})
        }
        crypto.pbkdf2(password, value['salt'], 310000, 32, 'sha256', function(err, hashedPassword)
        {   
            //force these both into buffers because that what the arguments are for the timed attack solve
            const storedHashedPassword = Buffer.from(value['password'], 'utf8')
            const hashedPasswordBuffer = Buffer.from(hashedPassword.toString('hex'))
            if(err){ return cb(err)}

            if(!crypto.timingSafeEqual(storedHashedPassword, hashedPasswordBuffer))
            {
                return cb(null, false, { message: 'Incorrect username or password.'})
            }
            return cb(null, value)
        })
    })
}))

passport.serializeUser(function(user, cb){
   cb(null, user.id)
})

passport.deserializeUser(function(id, cb) {
    //the id should be the username in this case
    sql.get_user(id).then(user => {
        if(user){
            return cb(null, user)
        } else {
            return cb(new Error('User not found'), null)
        }
    })
})

//authenticating route maybe test it in the other configuration
//this really shouldn't need the next, because all that is doing is pushing it to another function
app.post('/recorder', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return next(err); // Pass the error to the next middleware (Express error handler)
        }
        if (!user) {
            return res.status(401).json({ message: info.message || 'Authentication failed' });
        }
        req.login(user, (err) => {
            if (err) {
                return next(err); // Pass the error to the next middleware (Express error handler)
            }
            return res.status(200).json({ message: 'Authentication successful', user: user });
        });
    })(req, res, next); // Pass `next` to the passport authenticate function
});

//everything below this is actual app functionality not auth
//set this path to get all the teams info by default
app.get('/teams',(req, res) => {
    sql.get_teams().then( teams => {
        res.json(teams)
    }).catch(err => {
        res.status(500).json({error: 'Failed to fetch teams', details: err})
    })
})

app.get('/team', (req, res) => {
    //I don't know whether I should be using 
    sql.get_team(req.query.name).then(res.send.bind(res))
})

app.post('/addTeam', passport.authenticate('session'), (req, res) => {
    if (req.isAuthenticated()){
        sql.add_team(req.body.name)
    }
})

app.post('/setDistance', passport.authenticate('session'), (req, res) =>
{   
    if (req.isAuthenticated())
    {
        sql.set_distance(req.body.distance, req.body.name)
        //maybe this should be included in the then clause
        sql.increment_order()
    }
})

//setup a post path to update the different ones via a sql call
app.listen(port, () => {
    //run from the 
    console.log('Tractor pull backend listening on port 3000')
})