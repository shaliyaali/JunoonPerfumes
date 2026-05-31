const mongoose=require('mongoose')
console.log(mongoose.connection.name)

const wishlistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  variantId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  }
},
 { timestamps: true }
)
module.exports=mongoose.model('wishlist',wishlistSchema)