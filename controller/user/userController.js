const PDFDocument = require('pdfkit');

const userService = require('../../services/userService')
const nodemailer = require('nodemailer')
require('dotenv').config()
const { createOtpSession,getRemainingTime } = require('../../utils/otpManager')
const { verifyOtpSession, clearOtpSession } = require('../../utils/otpManager')
const bcrypt = require('bcrypt')
const { validatePincodeMatch } = require('../../utils/pincodeValidator')
const passport = require('passport')
const wishlistService = require('../../services/wishlistService')
const productService = require('../../services/productService')
const cartService = require('../../services/cartService')
const Category=require('../../model/categorySchema')
const Order = require('../../model/orderSchema');
const Coupon = require('../../model/couponSchema');
const Wallet = require('../../model/walletSchema');
const orderService = require('../../services/orderService');
const Cart = require('../../model/cartSchema');

// Helper function to get common header data
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

const loadhome = async (req, res, next) => {
  try {
  
    const { wishlistCount, cartCount, categories } = await getCommonHeaderData(req);
    let wishlistIds = [];
    if (req.session.user) {
      const wishlist= await wishlistService.getWishlistByUser(req.session.user.id);
      wishlistIds=wishlist.map(item=>item.product._id.toString());
    }
    
    // Fetch up to 6 featured products that are currently active
    const featuredProducts = await productService.getProducts({ isFeatured: true, status: 'Active' }, 1, 6);

    res.render('account/home', { 
        wishlistCount, 
        cartCount, 
        wishlistIds,
        categories,
        search: "",
        featuredProducts ,
        session: req.session,
        activePage: 'home'
    })
  }
  catch (error) {
   next(error)
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

const loadProfile = async (req, res,next) => {
  try {
    const message = req.session.message
    delete req.session.message
    const { wishlistCount, cartCount ,categories} = await getCommonHeaderData(req);
    const user = await userService.getUserById(req.session.user.id)
   
    return res.render('account/profile', { user, message, wishlistCount, cartCount, categories, search: "", activePage: 'profile', session: req.session });
  } catch (error) {
    next(error)
  }
}

const loadWishlist = async (req, res) => {
  try {
    const message = req.session.message;
    delete req.session.message;
    
    const user = await userService.getUserById(req.session.user.id);
    const wishlist = await wishlistService.getWishlistByUser(req.session.user.id);
  
    const { wishlistCount, cartCount, categories } = await getCommonHeaderData(req);

    const processedWishlist =wishlist.map(item =>{
      const product=item.product;
      if(!product) return item;
      const variant=product.variants.find(v=>v._id.toString() === item.variantId.toString());
      const productOffer=product.offer || 0;
      const categoryOffer=(product.category && product.category.offer) || 0;
      const maxOffer=Math.max(productOffer,categoryOffer);
      
      return {
        ...item.toObject(),
        displayVariant : variant,
        maxOffer:maxOffer
      }

    })

    return res.render('account/wishlist', { 
        user, 
        message, 
        session: req.session,
        wishlistCount,
        cartCount,
        categories,
        search: "",
        activePage: 'wishlist',
        wishlistItems: processedWishlist
    });
  } catch (error) {
    console.error(' Wishlist Render Error:', error.message);
    // Temporarily send the error to the screen so you can see what's wrong
    if (process.env.NODE_ENV === 'development') return res.status(500).send(error.message);
    return res.redirect('/');
  }
};

const loadRefer = async (req, res, next) => {
  try {
    const { wishlistCount, cartCount, categories } = await getCommonHeaderData(req);
    const user = await userService.getUserById(req.session.user.id);
    
    res.render('account/refer', {
      user, wishlistCount, cartCount, categories,
      session: req.session, search: "", activePage: 'refer'
    });
  } catch (error) {
    next(error);
  }
};

const toggleWishlist = async (req, res) => {
    try {
        const { productId, variantId } = req.body;
        const userId = req.session.user.id;
        const result = await wishlistService.toggleWishlist(userId, productId, variantId);
       // console.log('inside toggle wishlist 2',result)
        const wishlistItems = await wishlistService.getWishlistByUser(userId);
        res.json({ success: true, added: result.added, wishlistCount: wishlistItems.length });
    } catch (error) {
        console.error('Error toggling wishlist:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Add to Cart from product listing/details
const addToCart = async (req, res, next) => {
    try {
        const { productId, variantId, quantity } = req.body;
       
        const userId = req.session.user.id;
        const {cart,message} = await cartService.addToCart(userId, productId, variantId, quantity || 1);
        const totalQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0);
        res.json({ success: true, message: message, cartCount: totalQuantity });
    } catch (error) {
       
        next(error); 
    }
};


const loadCart = async (req, res, next) => {
  try {
   
    const message = req.session.message ;
    delete req.session.message;
    
    if (!req.session.user) return res.redirect('/signin');
    const search=(req.query.search|| '').trim();
    const query = { name: {$regex: search, $options:'i'}}

    const user = await userService.getUserById(req.session.user.id);
    const cart = await cartService.getCart(req.session.user.id,query);
    //console.log('____________cart_____:', cart)

    const wishlist = await wishlistService.getWishlistByUser(req.session.user.id);
    const wishlistItems = wishlist.filter(item =>  item.product !== null );

    const wishlistCount = wishlistItems.length;


    const commonHeaderData = await getCommonHeaderData(req);
    const cartCount = commonHeaderData.cartCount;

    const categories=commonHeaderData.categories;

    // Recalculate totals for AJAX response
    let subtotal = 0;
    if (cart && cart.items) {
      subtotal = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    }
    const hasInvalidItem = cart && cart.items ? cart.items.some(item => item.status === 'out of stock') : false;
    
    if (req.query.ajax === 'true') {
      return res.json({ cart, wishlistCount, cartCount, search, subtotal, hasInvalidItem });
    }

    return res.render('account/cart', { user, cart, message, session: req.session, wishlistCount, cartCount, categories, search });
  } catch (error) {
   
   
    next(error); // The middleware will render the error page or 404
  }
};

const loadCheckout = async (req, res, next) => {
  try {
    const message = req.session.message;
    delete req.session.message;
    const { wishlistCount, cartCount } = await getCommonHeaderData(req);

    if (!req.session.user) return res.redirect('/signin');

    const userId = req.session.user.id;
    const user = await userService.getUserAddresses(userId);
    const cart = await cartService.getCart(userId);
    const wallet = await Wallet.findOne({ user: userId });

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
    const shippingCharge = 0; 
    const couponDiscount = 0;

    // Find coupons already used by this user
    const usedCoupons = await Order.find({ 
        user: userId, 
        couponCode: { $ne: null },
        status: { $ne: 'Cancelled' } // Optional: allow reuse if previous order was cancelled
    }).distinct('couponCode');

    const categories=await Category.find({status:'Active'})
    // Filter available coupons by checking if they are NOT in the usedCoupons array
    const coupons = await Coupon.find({ 
        status: 'Active', 
        expiryDate: { $gte: new Date() },
        minPurchase: { $lte: subtotal },
        code: { $nin: usedCoupons }
    });
    const totalAmount = subtotal 
  
    res.render('account/checkout', {
      user,
      cart,
      addresses: user.addresses,
      subtotal, totalAmount, shippingCharge, couponDiscount,
      message,
      session: req.session, wishlistCount, cartCount, couponMessage: '',
      size:1,
      categories,
      search:" ",
      activePage:'checkout',
      coupons,
      wallet: wallet || { balance: 0 }
    });
  } catch (error) {
    next(error);
  }
};

const placeOrder = async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const { selectedAddress, paymentMethod, couponCode } = req.body;

    if (!selectedAddress || !paymentMethod) {
      req.session.message = 'Please select a shipping address and payment method.';
      return res.redirect('/checkout');
    }

    // 1. Recalculate Subtotal from Cart (Security: ignore client-side totals)
    const cart = await cartService.getCart(userId);
    if (!cart || cart.items.length === 0) {
      return res.redirect('/cart');
    }

    const subtotal=cart.items.reduce((acc,item)=> acc + (item.price * item.quantity),0)
    const shippingCharge = 0;
    let couponDiscount =0;

    if(couponCode) {
      const coupon = await Coupon.findOne({
        code :couponCode,
        status: 'Active',
        expiryDate: {$gte :new Date()}
      });

      if (coupon && subtotal >= coupon.minPurchase) {
        if (coupon.offerType === 'Percentage') {
          couponDiscount = Math.min((subtotal * coupon.offerValue) / 100, coupon.maxDiscount || Infinity);
        } else {
          couponDiscount = coupon.offerValue;
        }
      }
    }
    const newOrder = await orderService.createOrder(userId, selectedAddress, paymentMethod, couponDiscount, shippingCharge, couponCode);

    // Clear cart for COD/Wallet as payment is immediate/confirmed
    await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [] } });

    //req.session.message = 'Order placed successfully!';
    res.redirect(`/order-success/${newOrder.orderId}`);

  } catch (error) {
    next(error);
  }
};

const applyCouponAjax = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { couponCode } = req.body;
    const cart = await cartService.getCart(userId);
    const subtotal = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    
    let couponDiscount = 0;
    let couponMessage = '';
    
    const coupon = await Coupon.findOne({ 
      code: couponCode, 
      status: 'Active', 
      expiryDate: { $gte: new Date() } 
    });
    
    if (coupon) {
       // Security check: Check if user has already used this specific coupon
        const alreadyUsed = await Order.findOne({ 
            user: userId, 
            couponCode: couponCode,
            status: { $ne: 'Cancelled' } 
        });

        if (alreadyUsed) {
            return res.json({ success: false, couponDiscount: 0, couponMessage: 'You have already used this coupon.' });
        }

      if (subtotal >= coupon.minPurchase) {
        if (coupon.offerType === 'Percentage') {
          couponDiscount = Math.min((subtotal * coupon.offerValue) / 100, coupon.maxDiscount || Infinity);
        } else {
          couponDiscount = coupon.offerValue;
        }
        couponMessage = 'Coupon applied successfully!';
      } else {
        couponMessage = `Minimum purchase of ₹${coupon.minPurchase} required.`;
      }
    } else {
      couponMessage = 'Invalid or expired coupon.';
    }

    const totalAmount = subtotal - couponDiscount;
    res.json({ success: couponDiscount > 0, subtotal, shippingCharge: 0, couponDiscount, totalAmount, couponMessage });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const loadOrderSuccess = async (req, res, next) => {
  try {
    const orderId = req.params.orderId; 
    const { wishlistCount, cartCount ,categories} = await getCommonHeaderData(req);
    const order = await orderService.getOrderById(orderId);

    if (!order || order.user._id.toString() !== req.session.user.id) {
      req.session.message = 'Order not found or you do not have permission to view it.';
      return res.redirect('/');
    }
    

    res.render('account/orderSuccess', { order, session: req.session , wishlistCount, cartCount,categories,search:"",activePage:'orderSuccess'});
  } catch (error) {
    next(error);
  }
};

const loadMyOrders = async (req, res, next) => {
  try {
    
    const { wishlistCount, cartCount, categories } = await getCommonHeaderData(req);
    const user=await userService.getUserById(req.session.user.id)
    const search = (req.query.search || '').trim();
    const startDate = req.query.startDate || '';
    const endDate = req.query.endDate || '';
    const page=parseInt(req.query.page)|| 1;
    const limit=4;
    const {orders,totalPages,currentPage} = await orderService.getOrdersByUser(req.session.user.id, search, page, limit, startDate, endDate);
   
    res.render('account/myOrders', { user, wishlistCount, cartCount, categories, orders, search, totalPages, currentPage, session: req.session, activePage:'myorders', startDate, endDate });
  } catch (error) {
    next(error);
  }
};
const loadOrderDetails= async(req,res,next)=>{
  try {
    const { orderId,itemId} = req.params;
    
    const { wishlistCount, cartCount, categories } = await getCommonHeaderData(req);
    const user=await userService.getUserById(req.session.user.id)
    const userId=req.session.user.id;
    const order = await orderService.getOrderByIdAndUser(orderId,userId);
    if(!order){
      return res.redirect('/profile/myorders');
    }
    
    const item= order.items.id(itemId);
    const address=order.user.addresses.id(order.shippingAddress);

    // Calculate proportional coupon discount for this specific item
    const orderSubtotal = order.items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    const itemTotal = item.price * item.quantity;
    const itemCouponDiscount = orderSubtotal > 0 ? Math.round((itemTotal / orderSubtotal) * (order.couponDiscount || 0)) : 0;
    const finalItemAmount = itemTotal - itemCouponDiscount;

    res.render('account/orderDetails',{
      order,
      item,
      address,
      session:req.session,
      wishlistCount,
      cartCount,
      categories,
      itemTotal,
      itemCouponDiscount,
      finalItemAmount,
      search: "",
      activePage:'orderDetails',
      user
    })
  } catch (error) {
    next(error);
  }

}

// const cancelOrder = async (req, res) => {
//   try {
//     const { orderId, reason } = req.body;
//     // Reuse service logic - it already handles stock restoration
//     await orderService.updateOrderStatus(orderId, 'Cancelled');
//     // Update the reason specifically
//     await Order.updateOne({ orderId }, { cancelReason: reason });
    
//     res.json({ success: true, message: 'Order cancelled successfully' });
//   } catch (error) {
//     res.status(400).json({ success: false, message: error.message });
//   }
// };

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
    res.status(400).json({ success: false, message: error.message });
  }
}

const downloadInvoice = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    //  Fetch order
    const order = await Order.findOne({orderId}).populate("user");

    if (!order) {
      return res.status(404).send("Order not found");
    }

    const address = order.user.addresses.id(order.shippingAddress) 

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
        const { productId, variantId, quantity } = req.body;
        const userId = req.session.user.id;
        const { cart, message } = await cartService.addToCart(userId, productId, variantId, quantity || 1);
        await wishlistService.toggleWishlist(userId, productId, variantId);
        const wishlistItems = await wishlistService.getWishlistByUser(userId);
        const totalQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0);

        res.json({ 
            success: true, 
            message: message || 'Moved to Shopping Bag',
            cartCount: totalQuantity,
            wishlistCount: wishlistItems.length
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const loadManageAddress=async (req,res)=>{
  try {
    const userId=req.session.user.id
    const user=await userService.getUserAddresses(userId)
    const { wishlistCount, cartCount } = await getCommonHeaderData(req);
    
    if(!user){
      // If user not found, it's a critical error or session issue
      throw new Error('User not found for managing addresses');
    }
    
    const message = req.session.message
    delete req.session.message

    res.render('account/manageaddress',{
      user,
      addresses:user.addresses,
      message:message,
      wishlistCount, cartCount, activePage: 'manageaddress'
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

const registerUser = async (req, res, next) => {
 try {
  const message = req.session.message
  delete req.session.message

  const { name, email, password, cpassword, referralCode } = req.body

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

    if (referralCode) {
      const referrer = await userService.findByReferralCode(referralCode);
      if (!referrer) {
        return res.render('auth/signup', { message: "Invalid referral code" });
      }
     
      if (referrer.email === email) {
        return res.render('auth/signup', { message: "You cannot use your own referral code." });
      }

    }

    await userService.checkEmailExist(email)

    const otp = createOtpSession(req, "signup",
      { name, email, password, referralCode })

    const subject='verify your account';
    await sendVerificationEmail(email, otp,subject)
    return res.render('auth/otp', {
       message: 'OTP sent to email', 
       otpRoute: 'verify-otp', 
       remainingTime :60})

  } catch (err) {
    console.error(' sign up error ', err)
    return res.render('auth/signup', { message: err.message })
  }

}
const verifyOtp = async (req, res, next) => {
  try {
    const { otp } = req.body
    console.log('inside verify otp')
    const result = verifyOtpSession(req, otp, "signup")
    
    if (!result.sucess) {
      return res.render('auth/otp', {
        message: result.message,
        otpRoute: 'verify-otp',
        remainingTime: getRemainingTime(req)
      })
    }

    const userData = result.payload
    console.log('____inside verify otp, usrdata:',userData)
    const newUser = await userService.createUser(userData)
    console.log('____inside verify otp',newUser)
    
    if (userData.referralCode) {
      const referrer = await userService.findByReferralCode(userData.referralCode);
      console.log('____referrer:____',referrer)
      if (referrer) {
        const rewardAmount = 100;

        // Credit Referrer's Wallet
        await Wallet.findOneAndUpdate(
          { user: referrer._id },
          {
            $inc: { balance: rewardAmount },
            $push: { transactions: { amount: rewardAmount, type: 'Credit', description: `Referral Reward for inviting ${newUser.name}`, date: new Date() } }
          },
          { upsert: true }
        );

        // Signup Bonus
        const rewardAmount1=50
        await Wallet.findOneAndUpdate(
          { user: newUser._id },
          {
            $inc: { balance: rewardAmount1 },
            $push: { transactions: { amount: rewardAmount1, type: 'Credit', description: 'Referral Signup Bonus', date: new Date() } }
          },
          { upsert: true }
        );
      }
    }

    clearOtpSession(req)
    req.session.message = 'registered sucessfull'
    return res.redirect('/signin')
  } catch (error) {
    next(error);
  }
};

const resendOtp = async (req, res, next) => {
  try {
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
      remainingTime: getRemainingTime(req)
    })
  } catch (error) {
    next(error);
  }
};

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
      //console.log('user logged in successfully', user)
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
    const { wishlistCount, cartCount, categories } = await getCommonHeaderData(req);
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
    
    let wishlistIds = [];
    if (req.session.user) {
    const items = await wishlistService.getWishlistByUser(req.session.user.id);
    wishlistIds = items.map(item => item.product._id.toString());
    }
   
    res.render('account/productdetails', { 
      product, 
      relatedProducts, 
      wishlistIds, 
      session: req.session,
      wishlistCount,
      cartCount,
      categories,
      search: "",
      activePage: 'productdetails'
    });
  } catch (error) {
    console.error('Error loading product details:', error);
    res.redirect('/allfragrence');
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const userid = req.session.user.id
    const { name, phone } = req.body
    await userService.updateProfile(userid, name, phone)
    req.session.user.name = name
    req.session.user.phone = phone
    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    next(error);
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
      
      // Save session explicitly before redirecting to ensure returnTo is available
      req.session.save(() => {
        res.redirect('/');
      });
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
    return res.redirect('/')

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

const deleteAddress = async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const addressId = req.params.id;

    await userService.deleteAddress(userId, addressId);

    // For a DELETE request, respond with JSON
    res.json({ success: true, message: "Address deleted successfully." });
  } catch (err) {
    // Pass error to the error handling middleware
    next(err);
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
  const updateCartQuantity = async (req, res, next) => {
    try {
        const { productId, variantId, change } = req.body;
        const userId = req.session.user.id;
        const result = await cartService.updateQuantity(userId, productId, variantId, change);
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
};

const removeCartItem = async (req, res, next) => {
    try {
        const { productId, variantId } = req.body;
        const userId = req.session.user.id;
        const result = await cartService.removeItem(userId, productId, variantId);
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
};
module.exports = { loadRegister, registerUser, loadhome, pageNotFound, verifyOtp, loadLogin, loadOtp, resendOtp, userLogin, loadProfile, updateProfile, editEmail, verifyEmailOtp, loadForgetPassword, passwordReset, verifyResetOtp, resetPassword ,changePassword,logoutUser,addAddress,editAddress,deleteAddress,loadManageAddress,googleCallback,getPincodeDetails, loadWishlist, toggleWishlist, loadProductDetails, addToCart,loadCart,updateCartQuantity,removeCartItem, loadCheckout, placeOrder, loadOrderSuccess, loadMyOrders, cancelOrderItem, returnOrderItem, downloadInvoice,wishlistToBag ,loadOrderDetails, applyCouponAjax, loadRefer}
