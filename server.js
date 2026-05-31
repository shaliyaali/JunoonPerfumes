const express = require("express");
const app = express();
const config = require('./src/config/config');
const path = require('path');
const db = require('./src/config/db');
const userRouter = require('./src/routes/user');
const adminRouter = require('./src/routes/admin');
const session = require('express-session');
const nocache = require('nocache');
const passport = require('./src/config/passport');
const flash = require('connect-flash');
const errorHandler = require('./src/middlewares/errorHandler');

app.use(nocache())

app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24
  }
}))

app.use(flash())

app.use((req, res, next) => {
  res.locals.session = req.session
  res.locals.success_msg = req.flash('success_msg')
  res.locals.error_msg = req.flash('error_msg')
  next()
})

app.use(passport.initialize())
app.use(passport.session())


app.use(express.urlencoded({ extended: true }))
app.use(express.json())



app.use('/', userRouter)
app.use('/admin', adminRouter)


app.set('view engine', 'ejs')
app.set('views', [path.join(__dirname, 'views/user'), path.join(__dirname, 'views/admin')])
app.use(express.static(path.join(__dirname, "src/public")));


app.use(errorHandler);


const PORT = config.port;

const startServer = async () => {
  try {
    await db(config.mongoUri);
    app.listen(PORT, () => {
      console.log("_______________server started_________________");
    })
  } catch (error) {
    console.error('failed to start server:', error)
    process.exit(1)
  }
}
startServer();
