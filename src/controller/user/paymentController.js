const Razorpay = require("razorpay");
const crypto = require("crypto");
const cartService = require("../../services/cartService");
const orderService = require("../../services/orderService");
const config = require("../../config/config");
const Coupon = require("../../model/couponSchema");
const Order = require("../../model/orderSchema");
const Category = require("../../model/categorySchema");
const wishlistService = require("../../services/wishlistService");
const Cart = require("../../model/cartSchema");

const razorpayInstance = new Razorpay({
  key_id: config.razorpay.keyId,
  key_secret: config.razorpay.keySecret,
});

const loadPaymentFailure = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.session.user.id;

    // Fetch common header data to prevent the header from breaking
    const categories = await Category.find({ status: "Active" });
    const wishlist = await wishlistService.getWishlistByUser(userId);
    const wishlistCount = wishlist.length;
    const cart = await cartService.getCart(userId);
    const cartCount = cart
      ? cart.items.reduce((sum, item) => sum + item.quantity, 0)
      : 0;

    res.render("account/paymentFailure", {
      orderId,
      session: req.session,
      search: "",
      activePage: "checkout",
      wishlistCount,
      cartCount,
      categories,
      user: req.session.user,
    });
  } catch (error) {
    console.log(error);
    res.redirect("/");
  }
};

const createRazorpayOrder = async (req, res) => {
  try {
    const userId = req.session.user.id;

    const { addressId, couponCode, orderId } = req.body;

    // If orderId is provided, this is a retry attempt for a failed payment
    if (orderId) {
      const existingOrder = await Order.findOne({ orderId, user: userId });
      if (!existingOrder) {
        return res.json({ success: false, message: "Order not found" });
      }

      // Use the amount already saved in the order (which includes the coupon discount)
      const options = {
        amount: Math.round(existingOrder.totalAmount * 100),
        currency: "INR",
        receipt: existingOrder.orderId,
      };

      const rzpOrder = await razorpayInstance.orders.create(options);

      existingOrder.razorpayOrderId = rzpOrder.id;
      await existingOrder.save();

      return res.json({
        success: true,
        order: rzpOrder,
        orderId: existingOrder.orderId,
        key_id: config.razorpay.keyId,
      });
    }

    const cart = await cartService.getCart(userId);
    if (!cart || cart.items.length === 0)
      //
      return res.json({ success: false, message: "cart is empty" }); //

    const subtotal = cart.items.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0,
    );
    const shippingCharge = 0;
    let couponDiscount = 0;

    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode,
        status: "Active",
        expiryDate: { $gte: new Date() },
      });
      if (coupon && subtotal >= coupon.minPurchase) {
        if (coupon.offerType === "Percentage") {
          couponDiscount = Math.min(
            (subtotal * coupon.offerValue) / 100,
            coupon.maxDiscount || Infinity,
          );
        } else {
          couponDiscount = coupon.offerValue;
        }
      }
    }
    const totalAmount = subtotal - couponDiscount + shippingCharge;

    const newOrder = await orderService.createOrder(
      userId,
      addressId,
      "Razorpay",
      couponDiscount,
      0,
      couponCode,
    );

    const options = {
      amount: Math.round(totalAmount * 100),
      currency: "INR",
      receipt: newOrder.orderId,
    };

    const rzpOrder = await razorpayInstance.orders.create(options);

    // Save the Razorpay Order ID to our database record
    newOrder.razorpayOrderId = rzpOrder.id;
    await newOrder.save();

    res.json({
      success: true,
      order: rzpOrder,
      orderId: newOrder.orderId,
      key_id: config.razorpay.keyId,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "could not initialize Razorpay order" }); //
  }
};

const handlePaymentFailure = async (req, res) => {
  try {
    const { razorpay_order_id, error_description } = req.body;

    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    order.paymentStatus = "Failed";
    if (error_description) {
      order.cancelReason = `Payment Failed: ${error_description}`;
    }
    await order.save();

    res.json({ success: true, message: "Order status updated to Failed" });
  } catch (error) {
    console.error("Failure handler error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
      req.body;

    const hmac = crypto.createHmac("sha256", config.razorpay.keySecret);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature === razorpay_signature) {
      let order = await Order.findOne({ razorpayOrderId: razorpay_order_id });

      // Fallback: If not found by Razorpay ID, check by our internal ID stored in the receipt
      if (!order) {
        const rzpOrder = await razorpayInstance.orders.fetch(razorpay_order_id);
        order = await Order.findOne({ orderId: rzpOrder.receipt });
      }

      if (!order) {
        return res.json({
          success: false,
          message: "Verification Error: Order not found in database",
        });
      }

      order.paymentStatus = "Completed";
      // Sync individual item payment statuses
      order.items.forEach((item) => {
        item.paymentStatus = "Completed";
      });

      await order.save();

      // Clear the cart only after successful payment verification
      await Cart.findOneAndUpdate(
        { user: order.user },
        { $set: { items: [] } },
      );

      res.json({ success: true, orderId: order.orderId });
    } else {
      console.error("payment verification failed: Signature Mismatch");
      const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
      if (order) {
        order.paymentStatus = "Failed";
        // Sync individual item payment statuses
        order.items.forEach((item) => {
          item.paymentStatus = "Failed";
        });
        await order.save();
      }
      res.json({
        success: false,
        message: "Payment verification failed",
        orderId: order?.orderId,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createRazorpayOrder,
  verifyRazorpayPayment,
  loadPaymentFailure,
  handlePaymentFailure,
};
