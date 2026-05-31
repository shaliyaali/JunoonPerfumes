const mongoose=require('mongoose')
console.log(mongoose.connection.name)

const categorySchema=new mongoose.Schema(
  {
    name:{
      type:String,
      required:true,
      trim:true,
      unique:true
    },
    slug:{
      type:String,
      required:true,
      unique:true,
      lowercase:true
    },
    offer:{
      type:Number,
      default:0
    },
    status:{
      type:String,
      default:'Active',
      enum:['Active','Inactive']
    }
  },
   {timestamps:true}
)
module.exports=mongoose.model('category',categorySchema)