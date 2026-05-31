const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    variantSize: { type: String },
    quantity: { type: Number, default: 1, max: 5 },
    price: { type: Number, required: true } // Price at the time of adding (best offer applied)
  }]
}, { timestamps: true });

module.exports = mongoose.model('Cart', cartSchema);