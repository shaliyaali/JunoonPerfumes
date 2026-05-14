const mongoose=require('mongoose')

const couponScheme=new mongoose.Schema({
  code:{
    type:String,
    required: true,
    unique: true,
    uppercase : true,
    trim : true
  },
  offerType:{
    type:String,
    required:true,
    enum:['Percentage','Fixed']

  },
  offerValue:{
    type:Number,
    required:true,
  },
  minPurchase:{
    type:Number,
    default:0,
  },
  maxDiscount:{
    type:Number,
    default:0,
  },
  expiryDate:{
    type:Date,
    required:true,

  },
  status:{
    type:String,
    required:true,
    enum:['Active','Inactive','Expired'],
    default:'Active'
  }
},{timestamps:true  });

module.exports=mongoose.model('Coupon',couponScheme)