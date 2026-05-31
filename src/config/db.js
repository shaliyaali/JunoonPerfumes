const mongoose = require('mongoose');

const connectDB = async (mongoUri) => {
  try{
   const conn = await mongoose.connect(mongoUri, {});
   console.log(`mongodb connected :${conn.connection.host}`)
   console.log("DB Name:", mongoose.connection.name)

  }
  catch(err){
    console.log(err)
    process.exit(1)

  }
}
module.exports=connectDB