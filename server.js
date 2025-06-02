const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');
const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');
const allowedIDs = require('./data/allowedIDs.json');
const scoreManager = require('./utils/scoreManager');
const quickdb = require('quick.db');
const { QuickDB } = require("quick.db");
const db = new QuickDB();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
    clientID: '1378340353932918794',
    clientSecret: '6IhM_J-mQd9SCZyknFLczEV_O6bAqKgo',
    callbackURL: 'http://208.87.101.105:5000/auth/discord/callback',
    scope: ['identify']
}, (accessToken, refreshToken, profile, done) => {
    if (allowedIDs.includes(profile.id)) return done(null, profile);
    return done(null, false);
}));

app.use(session({ secret: 'supersecret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', {
    failureRedirect: '/'
}), (req, res) => {
    res.redirect('/dashboard');
});

app.get('/dashboard', ensureAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/logout', (req, res) => {
    req.logout(() => res.redirect('/'));
});

app.get('/admin', ensureAuth, (req, res) => {
    if (allowedIDs.includes(req.user.id)) {
        res.sendFile(path.join(__dirname, 'views', 'admin.html'));
    } else {
        res.status(403).send('Accesso negato');
    }
});

app.post('/admin/update', ensureAuth, (req, res) => {
    if (allowedIDs.includes(req.user.id)) {
        const { username, instrumenti, decollo, formazione, dogfight, canyon, solista, atterraggio } = req.body;
        const userScore = {
            instrumenti: parseInt(instrumenti) || 0,
            decollo: parseInt(decollo) || 0,
            formazione: parseInt(formazione) || 0,
            dogfight: parseInt(dogfight) || 0,
            canyon: parseInt(canyon) || 0,
            solista: parseInt(solista) || 0,
            atterraggio: parseInt(atterraggio) || 0
        };
        db.set(`scores.${username}`, userScore);
        io.emit('scores', db.get('scores') || {});
        log(req.user.username, `Ha aggiornato il punteggio di ${username}`);
        res.redirect('/admin');
    } else {
        res.status(403).send('Accesso negato');
    }
});

app.post('/admin/delete', ensureAuth, (req, res) => {
    if (allowedIDs.includes(req.user.id)) {
        const { username } = req.body;
        db.delete(`scores.${username}`);
        io.emit('scores', db.get('scores') || {});
        log(req.user.username, `Ha rimosso ${username}`);
        res.redirect('/dashboard');
    } else {
        res.status(403).send('Accesso negato');
    }
});
function ensureAuth(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/');
}

io.on('connection', async (socket) => {
    socket.emit('scores', await db.get('scores') || {});
});
function log(user, action) {
    console.log(`User ${user} performed action: ${action}`);
}
server.listen(5000, () => console.log('Server started on http://localhost:3000'));