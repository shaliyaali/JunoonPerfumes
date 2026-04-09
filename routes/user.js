const express=require('express')
const router=express.Router()
const userController=require('../controller/userController.js')
const userauth=require('../middlewares/userauth')
const passport = require('passport')
const { all } = require('axios')
const allFragerenceController=require('../controller/allFragrenceController')


console.log('router page')

router.get('/',userController.loadhome)
router.get('/signup',userauth.isLogin,userController.loadRegister)
router.post('/signup',userController.registerUser)
router.get('/otp',userauth.isLogin,userController.loadOtp)
router.post('/verify-otp',userController.verifyOtp)
router.post('/resend-otp',userController.resendOtp)
router.get('/pagenotfound',userController.pageNotFound)
router.get('/signin',userauth.isLogin,userController.loadLogin)
router.post('/signin',userController.userLogin)
router.get('/logout', userController.logoutUser)
router.get('/profile',userauth.checkSession,userController.loadProfile)
router.post('/updateprofile',userauth.checkSession,userController.updateProfile)
router.post('/edit-email',userauth.checkSession,userController.editEmail)
router.post('/verify-email-otp',userauth.checkSession,userController.verifyEmailOtp)
router.get('/forget-password',userauth.isLogin,userController.loadForgetPassword)
router.post('/forget-password',userController.passwordReset)
 router.post('/verify-reset-otp',userController.verifyResetOtp)
router.post('/reset-password',userController.resetPassword)
router.post('/change-password',userauth.checkSession,userController.changePassword)
router.get('/manageaddress',userauth.checkSession,userController.loadManageAddress)
router.post('/add-address',userauth.checkSession,userController.addAddress)
router.post('/edit-address/:id',userauth.checkSession,userController.editAddress)
router.post('/delete-address/:id',userauth.checkSession,userController.deleteAddress)
//router.post('/validate-pincode',userController.validatePincode)
router.get('/api/pincode/:pincode', userController.getPincodeDetails);

router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback', userController.googleCallback);
//allfragrence page
router.get('/allfragrence',allFragerenceController.loadAllfragrence)
//product details
router.get('/product/:id', userController.loadProductDetails)
// wishlist
router.get('/wishlist',userauth.checkSession,userController.loadWishlist)
router.post('/wishlist/toggle', userauth.checkSession, userController.toggleWishlist)
router.post('/wishlist/to-cart', userauth.checkSession, userController.wishlistToBag)
//cart
router.get('/cart',userauth.checkSession,userController.loadCart)
router.post('/cart/add', userauth.checkSession, userController.addToCart)
router.post('/cart/update', userauth.checkSession, userController.updateCartQuantity)
router.post('/cart/remove', userauth.checkSession, userController.removeCartItem)
//checkout
router.get('/checkout', userauth.checkSession, userController.loadCheckout)
router.post('/place-order', userauth.checkSession, userController.placeOrder)
router.get('/order-success/:orderId', userauth.checkSession, userController.loadOrderSuccess)

//my orders
router.get('/profile/myorders', userauth.checkSession, userController.loadMyOrders)
router.post('/orders/cancel', userauth.checkSession, userController.cancelOrder)
router.post('/orders/cancel-item', userauth.checkSession, userController.cancelOrderItem)
router.post('/orders/return-item', userauth.checkSession, userController.returnOrderItem)
router.get('/orders/download-invoice/:orderId', userauth.checkSession, userController.downloadInvoice)
module.exports=router
