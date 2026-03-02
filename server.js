const express = require("express")
const app = express()
const env = require("dotenv").config()
const path = require('path')
const expresslayouts = require('express-ejs-layouts')
const db = require('./config/db')
const userRouter = require('./routes/user')
const adminRouter = require('./routes/admin')
const session = require('express-session')
const nocache = require('nocache')
const connectDB = require("./config/db")
const passport = require('./config/passport')

app.use(nocache())

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24
  }
}))

app.use((req, res, next) => {
  res.locals.session = req.session
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
app.use(express.static(path.join(__dirname, "public")));








const PORT = process.env.PORT

const startServer = async () => {
  try {
    await db();
    app.listen(PORT, () => {
      console.log("_______________server started_________________");
    })
  } catch (error) {
    console.error('failed to start server:', error)
    process.exit(1)
  }
}
startServer();
