const mongoose=require('mongoose')
require('dotenv').config()
const connectDB=async()=>{
  try{
    //const conn=await mongoose.connect(process.env.MONGO_URI,{})
   const conn= await mongoose.connect(process.env.MONGO_URI,{})
   console.log(`mongodb connected :${conn.connection.host}`)
   console.log("DB Name:", mongoose.connection.name)

  }
  catch(err){
    console.log(err)
    process.exit(1)

  }
}
module.exports=connectDB