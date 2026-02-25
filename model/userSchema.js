const mongoose=require('mongoose')

 console.log(mongoose.connection.name)

 const addressSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['home', 'work', 'other'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  house: {
    type: String,
    required: true
  },
  street: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  pincode: {
    type: String,
    required: true
  },
  country: {
    type: String,
    default: "India"
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, { _id: true })


const userSchema=new mongoose.Schema({
  name:{
    type:String,
    required:true
  },
  email:{
    type:String,
    required:true,
    unique:true
  },
  phone:{
    type:String,
    required:false,
    unique:false,
    sparse:true,
    default:null
  },
  googleId:{
    type:String,
    unique:true,
    sparse:true
  },
  password:{
    type:String,
    required:false
  },
  isBlocked:{
    type:Boolean,
    required:false
  },
  
    createdOn:{
      type:Date,
      default:Date.now
    },
    referalCode:{
      type:String,

    },
   addresses:[addressSchema]
       
})

const User=mongoose.model("user",userSchema)
module.exports=User