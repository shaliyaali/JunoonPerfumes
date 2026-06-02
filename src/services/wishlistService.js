const Wishlist = require('../model/wishlistSchema');
const Product = require('../model/productSchema'); // Ensure Product model is registered for population

const toggleWishlist = async (userId, productId, variantId) => {
  const existing = await Wishlist.findOne({ user: userId, product: productId, variantId: variantId });

  if (existing) {
    await Wishlist.findByIdAndDelete(existing._id);
    return { added: false };
  } else {
    const newItem = new Wishlist({
      user: userId,
      product: productId,
      variantId: variantId
    });
    await newItem.save();
    return { added: true };
  }
};

const getWishlistByUser = async (userId) => {
  return await Wishlist.find({ user: userId })
    .populate({
      path: 'product',
      populate: { path: 'category' }
    })
    .sort({ createdAt: -1 });
};

const isInWishlist = async (userId, productId, variantId) => {
    const item = await Wishlist.findOne({ user: userId, product: productId, variantId: variantId });
    return !!item;
};

const getWishlistCount = async (userId) => {
    return await Wishlist.countDocuments({ user: userId });
};

module.exports = { toggleWishlist, getWishlistByUser, isInWishlist, getWishlistCount };
