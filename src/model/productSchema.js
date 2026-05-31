const mongoose=require('mongoose')
console.log(mongoose.connection.name)

const variantSchema = new mongoose.Schema({
  size: {
    type: String,            
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  stock: {
    type: Number,
    required: true,
    default: 0
  },
  salePrice: {
    type: Number,
    required: true
  },
  sku: {
    type: String,
    unique: true
  }
});

const productSchema = new mongoose.Schema(
{
  name: {
    type: String,
    required: true,
    trim: true
  },
  tagline: {
    type: String,
    trim: true
  },

  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },

  description: {
    type: String
  },

  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "category",
    required: true
  },
  note:{
    type:String
  },
  offer: {
    type: Number,
    default: 0
  },

  images: [String],

  variants: [variantSchema],  

  status: {
    type: String,
    enum: ["Active", "Inactive"],
    default: "Active"
  },
  isFeatured: {
    type: Boolean,
    default: false
  }

},
{ timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);