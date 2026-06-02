const userschema = require('../model/userSchema')
const Cart = require('../model/cartSchema');
const Wishlist = require('../model/wishlistSchema');
const categoryService = require('../services/categoryService'); // Import categoryService

const checkSession = async (req, res, next) => {
  try {
    // 1. Check if session exists (Manual or Passport)
    if (!req.session.user) {
      if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
        return res.status(401).json({ success: false, message: "Session expired. Please sign in again." });
      }
      console.log("No user session found, redirecting to signin");
      return res.redirect('/signin')
    }

    // 2. Fetch User and check status
    const user = await userschema.findById(req.session.user.id || req.session.user._id)
    
    if (!user) {
      console.log("User in session not found in database");
      return req.session.destroy((err) => {
        if (err) console.log(err)
        res.clearCookie('connect.sid')
        return res.redirect('/signin')
      });
    } 
    
    if (user.isBlocked) {
      console.log("User is blocked, destroying session");
      return req.session.destroy((err) => {
        if (err) console.error("Session Destroy Error:", err)
        res.clearCookie('connect.sid')
        return res.redirect('/signin')
      })
    }

    // 3. Attach user to request (Avoiding conflict with Passport's req.user if possible)
    req.currentUser = user;
    res.locals.user = user; // Make user object available to all EJS templates

    // 4. Populate Global Header Data
    const [cart, wishlistCount, categories] = await Promise.all([ // Add categories to Promise.all
      Cart.findOne({ user: user._id }),
      Wishlist.countDocuments({ user: user._id }),
      categoryService.getAllActiveCategories() 
    ]);

    res.locals.wishlistCount = wishlistCount || 0;
    res.locals.cartCount = (cart && cart.items) ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
    res.locals.search = req.query.search || ''; // Ensure search is always defined
    res.locals.activePage = ''; // Provide a default to prevent "not defined" errors
    res.locals.categories = categories; // Set categories in res.locals
    res.locals.session = req.session;

    next()

  } catch (error) {
    console.error("CRITICAL: Auth Middleware Error:", error.message);
    res.redirect('/signin'); 
  }
}

const isLogin = (req, res, next) => {
  //console.log("entered in user auth")
  if (req.session.user) {
    return res.redirect('/')
  }
  console.log("entered in user auth")
  next()

}
module.exports = { isLogin, checkSession }