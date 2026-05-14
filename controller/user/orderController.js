
const Wallet = require('../../model/walletSchema');
const userService = require('../../services/userService');
const Category = require('../../model/categorySchema');
const wishlistService = require('../../services/wishlistService');
const cartService = require('../../services/cartService');

const getCommonHeaderData = async (req) => {
  let wishlistCount = 0;
  let cartCount = 0;
  const categories = await Category.find({ status: 'Active' });

  if (req.session.user) {
    const wishlist = await wishlistService.getWishlistByUser(req.session.user.id);
    wishlistCount = wishlist.length;
    const cart = await cartService.getCart(req.session.user.id);
    cartCount = cart ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
  }
  return { wishlistCount, cartCount, categories };
};

const loadWallet = async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = 10; // Transactions per page
    const skip = (page - 1) * limit;

    const { wishlistCount, cartCount, categories } = await getCommonHeaderData(req);
    const user = await userService.getUserById(userId);
    const wallet = await Wallet.findOne({ user: userId });

    let paginatedTransactions = [];
    let totalPages = 0;

    if (wallet && wallet.transactions) {
      const sortedTransactions = [...wallet.transactions].sort((a, b) => b.date - a.date);
      totalPages = Math.ceil(sortedTransactions.length / limit);
      paginatedTransactions = sortedTransactions.slice(skip, skip + limit);
    }

    res.render('account/mywallet', {
      user,
      wallet: wallet ? { ...wallet.toObject(), transactions: paginatedTransactions } : { balance: 0, transactions: [] },
      totalPages,
      currentPage: page,
      wishlistCount,
      cartCount,
      categories,
      search: "",
      session: req.session,
      activePage: 'mywallet'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  loadWallet
};