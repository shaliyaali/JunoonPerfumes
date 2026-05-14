const mongoose = require('mongoose');
const crypto=require('crypto')
const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  variantId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  price: { // Price per item at the time of order (after discounts)
    type: Number,
    required: true
  },
  // Optionally store variant details for historical accuracy
  variantSize: String,
  productName: String,
  productImage: String,
  status: {
    type: String,
    enum: ['Pending', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Return Requested', 'Return Rejected', 'Returned'],
    default: 'Pending'
  },
  reason: String
});

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  orderId:{
    type:String,
    required:true,
    unique:true
  },
  razorpayOrderId: {
    type: String,
    unique: true,
    sparse: true
  },
  shippingAddress: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user.addresses', // Reference to a subdocument in userSchema
    required: true
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Pending', 'Shipped', 'Out for Delivery', 'Delivered', 'Partially Delivered','Cancelled', 'Return Requested', 'Returned'],
    default: 'Pending'
  },
  cancelReason: String,
  paymentMethod: {
    type: String,
    enum: ['COD', 'Razorpay', 'Wallet'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Completed', 'Failed', 'Refunded'],
    default: 'Pending'
  },
  couponDiscount: {
    type: Number,
    default: 0
  },
  shippingCharge: {
    type: Number,
    default: 0
  },
  couponCode: {
    type: String,
    default: null
  }
}, { timestamps: true });
// Pre-validate hook to generate a unique orderId before validation occurs
orderSchema.pre('validate', function() {
  if (!this.orderId) {
    // Generate a shorter unique ID using the first segment of a UUID
    const fullUuid = crypto.randomUUID();
    this.orderId = 'ORD-' + fullUuid.split('-')[0].toUpperCase();
  }
  ;
});

module.exports = mongoose.model('Order', orderSchema);