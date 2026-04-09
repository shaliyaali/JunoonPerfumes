const PDFDocument = require('pdfkit');

const userService = require('../services/userService')
const nodemailer = require('nodemailer')
require('dotenv').config()
const { createOtpSession,getRemainingTime } = require('../utils/otpManager')
const { verifyOtpSession, clearOtpSession } = require('../utils/otpManager')
const bcrypt = require('bcrypt')
const { validatePincodeMatch } = require('../utils/pincodeValidator')
const passport = require('passport')
const wishlistService = require('../services/wishlistService')
const productService = require('../services/productService')
const cartService = require('../services/cartService')

const orderService = require('../services/orderService');

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

const loadWishlist = async (req, res) => {
  try {
    const message = req.session.message;
    delete req.session.message;
    
    const user = await userService.getUserById(req.session.user.id);
    const wishlistItems = await (await wishlistService.getWishlistByUser(req.session.user.id)).filter(item=>item.product !== null)
    return res.render('account/wishlist', { 
        user, 
        message, 
        session: req.session,
        wishlistItems 
    });
  } catch (error) {
    console.error('CRITICAL: Wishlist Render Error:', error.message);
    // Temporarily send the error to the screen so you can see what's wrong
    if (process.env.NODE_ENV === 'development') return res.status(500).send(error.message);
    return res.redirect('/');
  }
};

const toggleWishlist = async (req, res) => {
    try {
        const { productId, variantId } = req.body;
        const userId = req.session.user.id;
        const result = await wishlistService.toggleWishlist(userId, productId, variantId);
       // console.log('inside toggle wishlist 2',result)
        res.json({ success: true, added: result.added });
    } catch (error) {
        console.error('Error toggling wishlist:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Add to Cart from product listing/details
const addToCart = async (req, res) => {
    try {
        const { productId, variantId, quantity } = req.body;
        console.log('inside add to cart')
        const userId = req.session.user.id;
        await cartService.addToCart(userId, productId, variantId, quantity || 1);
        res.json({ success: true, message: 'Added to Shopping Bag' });
    } catch (error) {
        console.error('Add to cart error:', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
};


const loadCart = async (req, res) => {
  try {
   
    const message = req.session.message ;
    delete req.session.message;
    
    if (!req.session.user) return res.redirect('/signin');

    const user = await userService.getUserById(req.session.user.id);
    const cart = await cartService.getCart(req.session.user.id);
    console.log('cart:', cart)

    // Safety Check: Filter out items where the product might have been deleted/nullified
    if (cart && cart.items) {
        cart.items = cart.items.filter(item => item.product !== null);
    }

    return res.render('account/cart', { user, cart, message, session: req.session });
  } catch (error) {
   
    console.error('--- CART RENDER ERROR ---');
    
    return res.redirect('/');
  }
};

const loadCheckout = async (req, res) => {
  try {
    const message = req.session.message;
    delete req.session.message;

    if (!req.session.user) return res.redirect('/signin');

    const userId = req.session.user.id;
    const user = await userService.getUserAddresses(userId);
    const cart = await cartService.getCart(userId);

    if (!cart || cart.items.length === 0) {
      req.session.message = 'Your cart is empty. Please add items before checking out.';
      return res.redirect('/cart');
    }

    // Filter out items where product might be null (deleted products)
    cart.items = cart.items.filter(item => item.product !== null);
    if (cart.items.length === 0) {
        req.session.message = 'Your cart contains unavailable items. Please review your cart.';
        return res.redirect('/cart');
    }

    // Calculate totals (subtotal, potential shipping, discounts)
    let subtotal = 0;
    for (const item of cart.items) {
        subtotal += item.price * item.quantity;
    }
    const shippingCharge = subtotal > 5000 ? 0 : 50; // Example: Free shipping over 5000
    const totalAmount = subtotal + shippingCharge; // No coupon logic yet

    res.render('account/checkout', {
      user,
      cart,
      addresses: user.addresses,
      subtotal, shippingCharge, totalAmount,
      message,
      session: req.session
    });
  } catch (error) {
    console.error('Error loading checkout page:', error);
    res.redirect('/cart'); // Redirect to cart if there's an error
  }
};

const placeOrder = async (req, res) => {
  try {
    const { selectedAddress, paymentMethod } = req.body;
    const userId = req.session.user.id;

    if (!selectedAddress || !paymentMethod) {
      req.session.message = 'Please select a shipping address and payment method.';
      return res.redirect('/checkout');
    }

    // no coupon or shipping charge logic here, will be calculated in service
    const newOrder = await orderService.createOrder(userId, selectedAddress, paymentMethod);

    req.session.message = 'Order placed successfully!';
    res.redirect(`/order-success/${newOrder.orderId}`);

  } catch (error) {
    console.error('Error placing order:', error);
    req.session.message = error.message || 'Failed to place order. Please try again.';
    res.redirect('/checkout');
  }
};

const loadOrderSuccess = async (req, res) => {
  try {
    const orderId = req.params.orderId; 
    const order = await orderService.getOrderById(orderId);

    if (!order || order.user._id.toString() !== req.session.user.id) {
      req.session.message = 'Order not found or you do not have permission to view it.';
      return res.redirect('/');
    }

    res.render('account/orderSuccess', { order, session: req.session });
  } catch (error) {
    console.error('Error loading order success page:', error);
    res.redirect('/');
  }
};

const loadMyOrders = async (req, res) => {
  try {
    const search = req.query.search || '';
    const orders = await orderService.getOrdersByUser(req.session.user.id, search);
    res.render('account/myOrders', { orders, search, session: req.session });
  } catch (error) {
    console.error('Error loading My Orders:', error);
    res.redirect('/profile');
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { orderId, reason } = req.body;
    // Reuse service logic - it already handles stock restoration
    await orderService.updateOrderStatus(orderId, 'Cancelled');
    // Update the reason specifically
    await Order.updateOne({ orderId }, { cancelReason: reason });
    
    res.json({ success: true, message: 'Order cancelled successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const cancelOrderItem = async (req, res) => {
  try {
    const { orderId, itemId, reason } = req.body;
    await orderService.updateOrderItemStatus(orderId, itemId, 'Cancelled', reason);
    res.json({ success: true, message: 'Item cancelled successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const returnOrderItem = async (req, res) => {
  try {
    const { orderId, itemId, reason } = req.body;
    if (!reason) throw new Error('Return reason is mandatory');
    await orderService.updateOrderItemStatus(orderId, itemId, 'Return Requested', reason);
    
    res.json({ success: true, message: 'Return request submitted ' });
  }
  catch(error){

  }
}
const downloadInvoice = async (req, res) => {
  try {
    const orderId = req.params.id;

    //  Fetch order
    const order = await Order.findById(orderId).populate("user");

    if (!order) {
      return res.status(404).send("Order not found");
    }

    const address = order.shippingAddress; // adjust based on your schema

    // Create PDF
    const doc = new PDFDocument();

    //  Headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=invoice.pdf");

    //  Pipe
    doc.pipe(res);

    // ---- Your existing content ----
    doc.fontSize(12).font('Helvetica-Bold').text('Billed To:', 50, 210);
    doc.fontSize(10).font('Helvetica')
      .text(order.user.name, 50, 225)
      .text(order.user.email, 50, 240);

    if (address) {
      doc.fontSize(12).font('Helvetica-Bold').text('Shipped To:', 300, 210);
      doc.fontSize(10).font('Helvetica')
        .text(address.name, 300, 225)
        .text(`${address.house}, ${address.street}`, 300, 240)
        .text(`${address.city}, ${address.state} - ${address.pincode}`, 300, 255)
        .text(`Phone: ${address.phone}`, 300, 270);
    }

    // Items
    const tableTop = 330;
    doc.font('Helvetica-Bold');
    doc.text('Item Description', 50, tableTop);
    doc.text('Size', 250, tableTop);
    doc.text('Qty', 350, tableTop, { width: 50, align: 'center' });
    doc.text('Price', 400, tableTop, { width: 70, align: 'right' });
    doc.text('Amount', 480, tableTop, { width: 70, align: 'right' });

    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    let i = 0;
    order.items.forEach(item => {
      const y = tableTop + 30 + (i * 25);
      doc.font('Helvetica');
      doc.text(item.productName, 50, y, { width: 190 });
      doc.text(item.variantSize, 250, y);
      doc.text(item.quantity.toString(), 350, y, { width: 50, align: 'center' });
      doc.text(`INR ${item.price.toLocaleString()}`, 400, y, { width: 70, align: 'right' });
      doc.text(`INR ${(item.price * item.quantity).toLocaleString()}`, 480, y, { width: 70, align: 'right' });
      i++;
    });

    const subtotal = order.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const summaryY = tableTop + 50 + (i * 25);

    doc.moveTo(350, summaryY).lineTo(550, summaryY).stroke();

    doc.font('Helvetica').text('Subtotal:', 350, summaryY + 15, { width: 100, align: 'right' });
    doc.text(`INR ${subtotal.toLocaleString()}`, 480, summaryY + 15, { width: 70, align: 'right' });

    doc.text('Shipping Charge:', 350, summaryY + 30, { width: 100, align: 'right' });
    doc.text(`INR ${order.shippingCharge.toLocaleString()}`, 480, summaryY + 30, { width: 70, align: 'right' });

    if (order.couponDiscount > 0) {
      doc.text('Discount:', 350, summaryY + 45, { width: 100, align: 'right' });
      doc.text(`- INR ${order.couponDiscount.toLocaleString()}`, 480, summaryY + 45, { width: 70, align: 'right' });
    }

    doc.font('Helvetica-Bold').fontSize(12)
      .text('Total Paid:', 350, summaryY + 70, { width: 100, align: 'right' });

    doc.text(`INR ${order.totalAmount.toLocaleString()}`, 480, summaryY + 70, { width: 70, align: 'right' });

    doc.end();

  } catch (error) {
    console.error('Invoice Generation Error:', error);
    res.status(500).send('Error generating invoice.');
  }
};
const wishlistToBag = async (req, res) => {
    try {
        const { productId, variantId } = req.body;
        const userId = req.session.user.id;
        await cartService.addToCart(userId, productId, variantId, 1);
        await wishlistService.toggleWishlist(userId, productId, variantId);
        res.json({ success: true, message: 'Moved to Shopping Bag' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

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
async function sendVerificationEmail(email, otp,subject) {
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
      subject: subject,
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
      const subject='verify your account';
    await sendVerificationEmail(email, otp,subject)
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
  req.session.message='registered sucessfull'
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
        email: user.email,
       // password:user.password
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

const loadProductDetails = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await productService.getProductById(productId);
    
    if (!product || product.status !== 'Active') {
      return res.redirect('/allfragrence');
    }

    // Fetch a few related products from the same category
    const relatedProducts = await productService.getProducts({ 
      category: product.category._id, 
      _id: { $ne: product._id },
      status: 'Active' 
    }, 1, 4);

    res.render('account/productdetails', { product, relatedProducts, session: req.session });
  } catch (error) {
    console.error('Error loading product details:', error);
    res.redirect('/allfragrence');
  }
};

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
    const subject='Email verification';
    await sendVerificationEmail(newEmail, otp,subject)

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
    const subject='Password reset';
    //send otp
    await sendVerificationEmail(email, otp,subject)

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
    console.log('password',user.password)
    console.log(currentPassword)
    const passwordMatch = await bcrypt.compare(
      currentPassword,
      user.password
    )

    if (!passwordMatch) {
      return res.render('account/profile', {user,
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

const googleCallback = (req, res, next) => {
  passport.authenticate('google', (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      req.session.message = (info && info.message) || 'Google sign-in failed. Please try again.';
      return res.redirect('/signup');
    }
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        return next(loginErr);
      }
      
      req.session.user = {
        id: user._id,
        name: user.name,
        email: user.email
      }
      console.log("Google login session created:", req.session.user)
      return res.redirect('/')
    });
  })(req, res, next);
}



  

const addAddress = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const user = await userService.getUserAddresses(userId);
  console.log('inside add address')
    if (user.addresses.length >= 5) {
      req.session.message = "You can only add a maximum of 5 addresses.";
      return res.redirect('/manageaddress');
    }

    const {pincode} = req.body

    const pinCheck= await validatePincodeMatch(pincode);

    if (!pinCheck.valid) {
      req.session.message = pinCheck.message;
      return res.redirect('/manageaddress');
    }
     const addressData={
      ...req.body,
      city:pinCheck.city,
      state:pinCheck.state,
      isDefault:!!req.body.isDefault
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

    res.clearCookie('connect.sid')  
    return res.redirect('/signin')

  })

}
const editAddress = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const addressId = req.params.id;
    const formData = { ...req.body, isDefault: !!req.body.isDefault };

    const pinCheck = await validatePincodeMatch(formData.pincode);
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


  const getPincodeDetails=async(req,res)=>{
    const {pincode}=req.params;

    const result = await validatePincodeMatch(pincode);

  if (!result.valid) {
    return res.json({ success: false, message: result.message });
  }
console.log("city and state fetched",result.city,result.state)
  return res.json({
    success: true,
    city: result.city,
    state: result.state
  });
  }
  const updateCartQuantity = async (req, res) => {
    try {
        const { productId, variantId, change } = req.body;
        const userId = req.session.user.id;
        const result = await cartService.updateQuantity(userId, productId, variantId, change);
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const removeCartItem = async (req, res) => {
    try {
        const { productId, variantId } = req.body;
        const userId = req.session.user.id;
        const result = await cartService.removeItem(userId, productId, variantId);
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
module.exports = { loadRegister, registerUser, loadhome, pageNotFound, verifyOtp, loadLogin, loadOtp, resendOtp, userLogin, loadProfile, updateProfile, editEmail, verifyEmailOtp, loadForgetPassword, passwordReset, verifyResetOtp, resetPassword ,changePassword,logoutUser,addAddress,editAddress,deleteAddress,loadManageAddress,googleCallback,getPincodeDetails, loadWishlist, toggleWishlist, loadProductDetails, addToCart,loadCart,updateCartQuantity,removeCartItem, loadCheckout, placeOrder, loadOrderSuccess, loadMyOrders, cancelOrder, cancelOrderItem, returnOrderItem, downloadInvoice,wishlistToBag }

