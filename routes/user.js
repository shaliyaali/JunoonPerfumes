const express=require('express')
const router=express.Router()
const userController=require('../controller/userController.js')
const userauth=require('../middlewares/userauth')
const passport = require('passport')


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
router.post('/validate-pincode',userController.validatePincode)


router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',passport.authenticate('google', { failureRedirect: '/signup' }),
  userController.googleCallback
)




module.exports=router