const mongoose=require('mongoose')
const crypto = require('crypto');

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
    required:true,
    default:false
  },
  
  referralCode: {
    type: String,
    unique: true
  },
   addresses:[addressSchema]
       
}
,{timestamps:true})

userSchema.pre('save', function () {
  if (!this.referralCode) {
    
    this.referralCode = 'JN-' + crypto.randomBytes(3).toString('hex').toUpperCase();
  }
});

const User=mongoose.model("user",userSchema)
module.exports=User