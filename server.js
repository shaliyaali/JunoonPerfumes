const express=require("express")
const app=express()
const env=require("dotenv").config()
const path=require('path')
const expresslayouts=require('express-ejs-layouts')
const db=require('./config/db')
db()


app.set('views',path.join(__dirname,'views'))
app.set('view engine','ejs')
app.use(express.static('public'))

const userRoutes=require('./routes/user')
const adminRoutes=require('./routes/admin')




// app.get('/home',(req,res)=>{
//   res.render('user/auth//otp')
// })
// app.get('/user/signin',(req,res)=>{
//   res.render("user/auth//signin")

// })
// app.get('/user/forgot',(req,res)=>{
//   res.render('user/auth/forgotpassword')
// })









PORT=process.env.PORT

app.listen(PORT,()=>{
  console.log("________________server started___________________")
})