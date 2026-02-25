
const userService = require('../services/userService')
const nodemailer = require('nodemailer')
require('dotenv').config()
const { createOtpSession,getRemainingTime } = require('../utils/otpManager')
const { verifyOtpSession, clearOtpSession } = require('../utils/otpManager')
const bcrypt = require('bcrypt')
const { validatePincodeMatch } = require('../utils/pincodeValidator')


const loadhome = (req, res) => {

  try {
    console.log('session at home:', req.session)
    res.render('account/home')
  }
  catch (error) {
    console.log('home page not loading', error)
    res.status(500).send('server error')
  }
}
const loadOtp = (req, res) => {
  const message = req.session.message
  delete req.session.message
  res.render('auth/otp', { message, remainingTime :60 })
}


const loadLogin = (req, res) => {
  const message = req.session.message
  delete req.session.message
  res.render('auth/signin', { message })
}


const loadRegister = (req, res) => {
  const message = req.session.message
  delete req.session.message
  res.render('auth/signup', { message })
}

const loadProfile = async (req, res) => {
  try {
    const message = req.session.message
    delete req.session.message
    const user = await userService.getUserById(req.session.user.id)
    return res.render('account/profile', { user, message })

  } catch (error) {
    console.error('Error during profile loading:', error)
    return res.redirect('/')
  }
}

const loadManageAddress=async (req,res)=>{
  try {
    const userId=req.session.user.id
    const user=await userService.getUserAddresses(userId)
    
    if(!user){
      return res.redirect('/signin')
    }
    
    const message = req.session.message
    delete req.session.message

    res.render('account/manageaddress',{
      user,
      addresses:user.addresses,
      message:message
    })
  } catch (error) {
    console.error(error)
    res.status(500).render('page404')
    
  }

}
async function sendVerificationEmail(email, otp) {
  try {
    console.log('inside verification email')
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD
      }
    })
    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: 'verify your account',
      text: `your OTP is ${otp}`,
      html: `<b>Your OTP:${otp}</b>`
    })

    console.log("Email:", process.env.NODEMAILER_EMAIL)
    console.log("Password exists:", !!process.env.NODEMAILER_PASSWORD)
    return info.accepted.length > 0

  } catch (error) {
    console.error("Error sending email", error)
    return false;

  }
}

const loadForgetPassword = async (req, res) => {
  const message = req.session.message
  delete req.session.message

  res.render('auth/forgetpassword', { message })
}

const registerUser = async (req, res) => {
 try {
  const message = req.session.message
  delete req.session.message

  const { name, email, password, cpassword } = req.body

  if (!name || !email || !password || !cpassword) {
    return res.render('auth/signup', { message: "All fields required" })
  }

 
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.render('auth/signup', { message: "Invalid email format" })
  }

 
  if (password !== cpassword) {
    return res.render('auth/signup', { message: "Passwords do not match" })
  }

    await userService.checkEmailExist(email)


    const otp = createOtpSession(req, "signup",
      { name, email, password })

    await sendVerificationEmail(email, otp)
    console.log("Remaining time:", getRemainingTime(req));
    return res.render('auth/otp', {
       message: 'OTP sent to email', 
       otpRoute: 'verify-otp', 
       remainingTime :60})



  } catch (err) {
    console.error(' sign up error ', err)
    return res.render('auth/signup', { message: err.message })
  }

}
const verifyOtp = async (req, res) => {
  const { otp } = req.body
  console.log('inside verify otp')
  const result = verifyOtpSession(req, otp, "signup")
  console.log("Remaining time:", getRemainingTime(req));
  if (!result.sucess)
    return res.render('auth/otp',  {
  message: result.message ,
  otpRoute:'verify-otp',
  remainingTime :getRemainingTime(req)})

  const userData = result.payload

  await userService.createUser(userData)
  clearOtpSession(req)

  return res.redirect('/signin')


}

const resendOtp = async (req, res) => {

  const otpData = req.session.otp

  if (!otpData)
    return res.redirect('/signup')

  const otp = createOtpSession(req, otpData.purpose, otpData.payload)

  await sendVerificationEmail(
    otpData.payload.email,
    otp
  )

  const routeMap = {
    "signup": "verify-otp",
    "change-email": "verify-email-otp",
    "reset-password": "verify-reset-otp"
  }

  return res.render('auth/otp', {
    message: "New OTP sent",
    otpRoute: routeMap[otpData.purpose],
    remainingTime :getRemainingTime(req)
  })
}

const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await userService.userLogin(email, password)
    if (user) {
      //req.session.user=user
      req.session.user = {
        id: user._id,
        name: user.name,
        email: user.email
      }
      console.log('user logged in successfully', user)
      return res.redirect('/')
    }
    else {
      return res.render('auth/signin', { message: 'Invalid email or password' })
    }
  } catch (error) {
    console.error('Error during user login:', error)
    return res.render('auth/signin', { message: error.message })
  }
}

const updateProfile = async (req, res) => {
  try {
    const userid = req.session.user.id
    const { name, phone } = req.body
    await userService.updateProfile(userid, name, phone)
    req.session.user.name = name
    req.session.message = 'Profile updated'
    return res.redirect('/profile')

  } catch (error) {
    console.error('Profile update error', error)
    return res.redirect('/profile')

  }
}

const editEmail = async (req, res) => {
  try {
    const user = req.session.user
    const { newEmail } = req.body

    //block google users
    const use = await userService.getUserById(req.session.user.id)

    if (use.googleId) {
      return res.render('account/profile', {
        message: "Google users cannot change email"
      })
    }

    //same email
    if (newEmail === user.email) {
      req.session.message='no changes found'
      return res.redirect('/profile')
    }

    //already exist
    const existing = await userService.findByEmail(newEmail)
    if (existing)
      return res.redirect('/profile')

    //create otp session

    const otp = createOtpSession(req, "change-email", {
      userId: user.id,
      newEmail
    })
    //send otp
    await sendVerificationEmail(newEmail, otp)

    return res.render('auth/otp', { 
      message: 'OTP send to new email ', 
      otpRoute: 'verify-email-otp',
      remainingTime :getRemainingTime(req)})


  } catch (error) {
    console.error(error)
    res.redirect('/profile')

  }
}

const verifyEmailOtp = async (req, res) => {
  try {
    console.log('inside verify email otp')
    const { otp } = req.body
    const result = verifyOtpSession(req, otp, "change-email")

    if (!result.sucess) {
      return res.render('auth/otp', { 
      message: result.message,
      otpRoute:'verify-email-otp',
      remainingTime :getRemainingTime(req) })
    }
    const { userId, newEmail } = result.payload

    //update database
    await userService.updateEmail(userId, newEmail)

    //update session
    req.session.user.email = newEmail

    //clear otp
    clearOtpSession(req)

    req.session.message = 'Email updated sucessfully'
    return res.redirect('/profile')


  } catch (error) {
    console.error(error)
    return res.redirect('/profile')

  }
}

const passwordReset = async (req, res) => {
  try {
    console.log('inside passwordreset')

    const { email } = req.body

    const user = await userService.findByEmail(email)

    if (!user) {
      return res.render('auth/forgetpassword', {
        message: "Email not found"
      })
    }

    // block Google users
    if (user.googleId) {
      return res.render('auth/forgetpassword', {
        message: "Password reset not available for Google accounts"
      })
    }

    //create OTP session
    const otp = createOtpSession(req, "reset-password", {
      userId: user._id,
      email: user.email
    })

    await sendVerificationEmail(email, otp)

    return res.render('auth/otp', {
      message: "OTP sent to your email",
      otpRoute: "verify-reset-otp",
      remainingTime :getRemainingTime(req)
    })

  } catch (error) {
    console.error(error)
    return res.redirect('/forget-password')
  }

}

const verifyResetOtp = (req, res) => {

  const { otp } = req.body

  const result = verifyOtpSession(req, otp, "reset-password")

  if (!result.sucess) {
    return res.render('auth/otp', {
      message: result.message,
      otpRoute: "verify-reset-otp",
      remainingTime :getRemainingTime(req)
    })
  }

  // OTP correct
  return res.render('auth/resetpassword', {
    message: "OTP verified successfully"
  })
}


const resetPassword = async (req, res) => {

  try {
    console.log('inside reset password')
    const { password, confirmPassword } = req.body

    if (password !== confirmPassword) {
      return res.render('auth/reset-password', {
        message: "Passwords do not match"
      })
    }

    const otpData = req.session.otp

    if (!otpData || otpData.purpose !== "reset-password") {
      return res.redirect('/forget-password')
    }

    const userId = otpData.payload.userId

    await userService.updatePassword(userId, password)
    console.log('update pasword')

    clearOtpSession(req)

    return res.redirect('/signin')

  } catch (error) {
    console.error(error)
    return res.redirect('/forget-password')
  }
}

const changePassword = async (req, res) => {

  try {

    const sessionUser = req.session.user

    if (!sessionUser) {
      return res.redirect('/signin')
    }

    if (sessionUser.googleId) {
   return res.render('account/profile', {
      message: "Google users cannot change password"
   })
}

    const { currentPassword, newPassword, confirmPassword } = req.body

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.render('account/profile', {
        message: "All fields required"
      })
    }

    if (newPassword !== confirmPassword) {
      return res.render('account/profile', {
        message: "New passwords do not match"
      })
    }

    const user = await userService.getUserById(sessionUser.id)

    const passwordMatch = bcrypt.compare(
      currentPassword,
      user.password
    )

    if (!passwordMatch) {
      return res.render('account/profile', {
        message: "Current password is incorrect"
      })
    }

    await userService.updatePassword(user._id, newPassword)

    return res.render('account/profile', {user,
      message: "Password updated successfully"
    })

  } catch (error) {
    console.error(error)
    return res.redirect('/profile')
  }
}

const pageNotFound = (req, res) => {
  try {
    res.render('page404')
  }
  catch (err) {
    res.redirect('/pagenotfound')
  }
}

const googleCallback = (req, res) => {
  try {

    const user = req.user  

    if (!user) {
      return res.redirect('/signup')
    }

    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email
    }

    console.log("Google login session created:", req.session.user)

    return res.redirect('/')

  } catch (error) {
    console.error("Google callback error:", error)
    return res.redirect('/signup')
  }
}



  
const addAddress = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const user = await userService.getUserAddresses(userId);

    if (user.addresses.length >= 5) {
      req.session.message = "You can only add a maximum of 5 addresses.";
      return res.redirect('/manageaddress');
    }

    const addressData = { ...req.body, isDefault: !!req.body.isDefault };

    const pinCheck = await validatePincodeMatch(
      addressData.pincode,
      addressData.city,
      addressData.state
    );

    if (!pinCheck.valid) {
      req.session.message = pinCheck.message;
      return res.redirect('/manageaddress');
    }

    await userService.addAddress(userId, addressData);
    req.session.message = "Address added successfully.";
    return res.redirect('/manageaddress');

  } catch (error) {
    console.error("Add address error:", error);
    req.session.message = "Could not add address.";
    return res.redirect('/manageaddress');
  }
}

const logoutUser = (req, res) => {

  req.session.destroy((err) => {

    if (err) {
      console.error("Logout error:", err)
      return res.redirect('/profile')
    }

    res.clearCookie('connect.sid')  // important
    return res.redirect('/signin')

  })

}
const editAddress = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const addressId = req.params.id;
    const formData = { ...req.body, isDefault: !!req.body.isDefault };

    const pinCheck = await validatePincodeMatch(formData.pincode, formData.city, formData.state);
    if (!pinCheck.valid) {
      req.session.message = pinCheck.message;
      return res.redirect('/manageaddress');
    }

    await userService.editAddress(userId, addressId, formData);
    req.session.message = "Address updated successfully.";
    res.redirect('/manageaddress');

  } catch (err) {
    console.error(err);
    req.session.message = "Could not update address.";
    res.redirect('/manageaddress');
  }
}

const deleteAddress = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const addressId = req.params.id;

    await userService.deleteAddress(userId, addressId);

    req.session.message = "Address deleted successfully.";
    res.redirect('/manageaddress');

  } catch (err) {
    console.error(err)
    res.redirect('/profile')
  }
}

const validatePincode = async (req, res) => {
  try {
    const { pincode, city, state } = req.body
    console.log('inside validate pincode')
    const pinCheck = await validatePincodeMatch(pincode, city, state)
    
    return res.json(pinCheck)
    
  } catch (error) {
    console.error("Pincode validation error:", error)
    return res.status(500).json({ valid: false, message: "Internal server error" })
  }
}

module.exports = { loadRegister, registerUser, loadhome, pageNotFound, verifyOtp, loadLogin, loadOtp, resendOtp, userLogin, loadProfile, updateProfile, editEmail, verifyEmailOtp, loadForgetPassword, passwordReset, verifyResetOtp, resetPassword ,changePassword,logoutUser,addAddress,editAddress,deleteAddress,loadManageAddress,googleCallback,validatePincode}                                                                       
