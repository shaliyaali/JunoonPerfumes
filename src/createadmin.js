// require('dotenv').config()
// const mongoose = require('mongoose')
// const bcrypt = require('bcrypt')
// const Admin = require('./model/adminSchema')

// mongoose.connect(process.env.MONGO_URI)
//   .then(() => console.log("DB Connected"))

// async function createAdmin() {
//   try {

//     const email = "admin@junoon.com"
//     const plainPassword = "Admin@123"

//     const existing = await Admin.findOne({ email })
//     if (existing) {
//       console.log("Admin already exists")
//       process.exit()
//     }

//     const hashedPassword = await bcrypt.hash(plainPassword, 10)

//     await Admin.create({
//       email,
//       password: hashedPassword
//     })

//     console.log("Admin created successfully")
//     process.exit()

//   } catch (err) {
//     console.error(err)
//     process.exit()
//   }
// }

// createAdmin()