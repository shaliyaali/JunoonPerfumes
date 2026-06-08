const Wallet = require("../../model/walletSchema");
const userService = require("../../services/userService");
const cartService = require("../../services/cartService");
const PDFDocument = require("pdfkit");
const Order = require("../../model/orderSchema");
const orderService = require("../../services/orderService");
const Cart = require("../../model/cartSchema");
const Coupon = require("../../model/couponSchema");

const { getCommonHeaderData } = require("./userController");

const loadWallet = async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = 10; // Transactions per page
    const skip = (page - 1) * limit;

    const { wishlistCount, cartCount, categories } =
      await getCommonHeaderData(req);
    const user = await userService.getUserById(userId);
    const wallet = await Wallet.findOne({ user: userId });

    let paginatedTransactions = [];
    let totalPages = 0;

    if (wallet && wallet.transactions) {
      const sortedTransactions = [...wallet.transactions].sort(
        (a, b) => b.date - a.date,
      );
      totalPages = Math.ceil(sortedTransactions.length / limit);
      paginatedTransactions = sortedTransactions.slice(skip, skip + limit);
    }

    res.render("account/mywallet", {
      user,
      wallet: wallet
        ? { ...wallet.toObject(), transactions: paginatedTransactions }
        : { balance: 0, transactions: [] },
      totalPages,
      currentPage: page,
      wishlistCount,
      cartCount,
      categories,
      search: "",
      session: req.session,
      activePage: "mywallet",
    });
  } catch (error) {
    next(error);
  }
};

const downloadInvoice = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const itemId = req.params.itemId;

    //  Fetch order
    const order = await Order.findOne({ orderId }).populate("user");

    if (!order) {
      return res.status(404).send("Order not found");
    }

    const item = order.items.id(itemId);
    if (!item) {
      return res.status(404).send("Item not found in this order");
    }

    const address = order.user.addresses.id(order.shippingAddress);

    // Create PDF
    const doc = new PDFDocument();

    //  Headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice_${orderId}.pdf`,
    );

    //  Pipe
    doc.pipe(res);

    // Company Header
    doc.fontSize(20).font("Helvetica-Bold").text("JUNOON PERFUMES", 50, 45);
    doc
      .fontSize(10)
      .font("Helvetica")
      .text("123 Luxury Avenue, Thrissur District", 50, 70)
      .text("India, Kerala - 400001", 50, 85)
      .text(
        "Phone: +91 98765 43210 | Email: support@junoonperfumes.com",
        50,
        100,
      );

    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("INVOICE", 400, 45, { align: "right" });
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(`Order ID: #${orderId}`, 400, 70, { align: "right" })
      .text(
        `Date: ${new Date(order.orderDate).toLocaleDateString()}`,
        400,
        85,
        { align: "right" },
      );

    doc.moveTo(50, 120).lineTo(550, 120).stroke();

    // Billed To & Shipped To Sections
    doc.fontSize(12).font("Helvetica-Bold").text("Billed To:", 50, 150);
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(order.user.name, 50, 165)
      .text(order.user.email, 50, 180);

    if (address) {
      doc.fontSize(12).font("Helvetica-Bold").text("Shipped To:", 300, 150);
      doc
        .fontSize(10)
        .font("Helvetica")
        .text(address.name, 300, 165)
        .text(`${address.house}, ${address.street}`, 300, 180)
        .text(
          `${address.city}, ${address.state} - ${address.pincode}`,
          300,
          195,
        )
        .text(`Phone: ${address.phone}`, 300, 210);
    }

    // Items
    const tableTop = 330;
    doc.font("Helvetica-Bold");
    doc.text("Item Description", 50, tableTop);
    doc.text("Size", 250, tableTop);
    doc.text("Qty", 350, tableTop, { width: 50, align: "center" });
    doc.text("Price", 400, tableTop, { width: 70, align: "right" });
    doc.text("Amount", 480, tableTop, { width: 70, align: "right" });

    doc
      .moveTo(50, tableTop + 15)
      .lineTo(550, tableTop + 15)
      .stroke();

    let i = 0;

    const y = tableTop + 30 + i * 25;
    doc.font("Helvetica");
    doc.text(item.productName, 50, y, { width: 190 });
    doc.text(item.variantSize, 250, y);
    doc.text(item.quantity.toString(), 350, y, { width: 50, align: "center" });
    doc.text(`INR ${item.price.toLocaleString()}`, 400, y, {
      width: 70,
      align: "right",
    });
    doc.text(`INR ${(item.price * item.quantity).toLocaleString()}`, 480, y, {
      width: 70,
      align: "right",
    });
    i++;

    const orderSubtotal = order.items.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0,
    );
    const subtotal = item.price * item.quantity;
    const itemCouponDiscount =
      orderSubtotal > 0
        ? Math.round((subtotal / orderSubtotal) * (order.couponDiscount || 0))
        : 0;
    const finalItemAmount = subtotal - itemCouponDiscount;
    const summaryY = tableTop + 50 + i * 25;

    doc.moveTo(350, summaryY).lineTo(550, summaryY).stroke();

    doc
      .font("Helvetica")
      .text("Subtotal:", 350, summaryY + 15, { width: 100, align: "right" });
    doc.text(`INR ${subtotal.toLocaleString()}`, 480, summaryY + 15, {
      width: 70,
      align: "right",
    });

    doc.text("Shipping Charge:", 350, summaryY + 30, {
      width: 100,
      align: "right",
    });
    doc.text(
      `INR ${order.shippingCharge.toLocaleString()}`,
      480,
      summaryY + 30,
      { width: 70, align: "right" },
    );

    if (order.couponDiscount > 0) {
      doc.text("Discount:", 350, summaryY + 45, { width: 100, align: "right" });
      doc.text(
        `- INR ${itemCouponDiscount.toLocaleString()}`,
        480,
        summaryY + 45,
        { width: 70, align: "right" },
      );
    }

    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("Total Paid:", 350, summaryY + 70, { width: 100, align: "right" });

    doc.text(`INR ${finalItemAmount.toLocaleString()}`, 480, summaryY + 70, {
      width: 70,
      align: "right",
    });

    doc.end();
  } catch (error) {
    console.error("Invoice Generation Error:", error);
    res.status(500).send("Error generating invoice.");
  }
};

const cancelOrderItem = async (req, res) => {
  try {
    const { orderId, itemId, reason } = req.body;
    await orderService.updateOrderItemStatus(
      orderId,
      itemId,
      "Cancelled",
      reason,
    );
    res.json({ success: true, message: "Item cancelled successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const returnOrderItem = async (req, res) => {
  try {
    const { orderId, itemId, reason } = req.body;
    if (!reason) throw new Error("Return reason is mandatory");
    await orderService.updateOrderItemStatus(
      orderId,
      itemId,
      "Return Requested",
      reason,
    );

    res.json({ success: true, message: "Return request submitted " });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
const placeOrder = async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const { selectedAddress, paymentMethod, couponCode } = req.body;

    if (!selectedAddress || !paymentMethod) {
      req.session.message =
        "Please select a shipping address and payment method.";
      return res.redirect("/checkout");
    }

    // 1. Recalculate Subtotal from Cart (Security: ignore client-side totals)
    const cart = await cartService.getCart(userId);
    if (!cart || cart.items.length === 0) {
      return res.redirect("/cart");
    }

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
    const newOrder = await orderService.createOrder(
      userId,
      selectedAddress,
      paymentMethod,
      couponDiscount,
      shippingCharge,
      couponCode,
    );

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
    const subtotal = cart.items.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0,
    );

    let couponDiscount = 0;
    let couponMessage = "";

    const coupon = await Coupon.findOne({
      code: couponCode,
      status: "Active",
      expiryDate: { $gte: new Date() },
    });

    if (coupon) {
      // Security check: Check if user has already used this specific coupon
      const alreadyUsed = await Order.findOne({
        user: userId,
        couponCode: couponCode,
        status: { $ne: "Cancelled" },
      });

      if (alreadyUsed) {
        return res.json({
          success: false,
          couponDiscount: 0,
          couponMessage: "You have already used this coupon.",
        });
      }

      if (subtotal >= coupon.minPurchase) {
        if (coupon.offerType === "Percentage") {
          couponDiscount = Math.min(
            (subtotal * coupon.offerValue) / 100,
            coupon.maxDiscount || Infinity,
          );
        } else {
          couponDiscount = coupon.offerValue;
        }
        couponMessage = "Coupon applied successfully!";
      } else {
        couponMessage = `Minimum purchase of ₹${coupon.minPurchase} required.`;
      }
    } else {
      couponMessage = "Invalid or expired coupon.";
    }

    const totalAmount = subtotal - couponDiscount;
    res.json({
      success: couponDiscount > 0,
      subtotal,
      shippingCharge: 0,
      couponDiscount,
      totalAmount,
      couponMessage,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const loadOrderSuccess = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    const { wishlistCount, cartCount, categories } =
      await getCommonHeaderData(req);
    const order = await orderService.getOrderById(orderId);

    if (!order || order.user._id.toString() !== req.session.user.id) {
      req.session.message =
        "Order not found or you do not have permission to view it.";
      return res.redirect("/");
    }

    res.render("account/orderSuccess", {
      order,
      session: req.session,
      wishlistCount,
      cartCount,
      categories,
      search: "",
      activePage: "orderSuccess",
    });
  } catch (error) {
    next(error);
  }
};

const loadMyOrders = async (req, res, next) => {
  try {
    const { wishlistCount, cartCount, categories } =
      await getCommonHeaderData(req);
    const user = await userService.getUserById(req.session.user.id);
    const search = (req.query.search || "").trim();
    const startDate = req.query.startDate || "";
    const endDate = req.query.endDate || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const { orders, totalPages, currentPage } =
      await orderService.getOrdersByUser(
        req.session.user.id,
        search,
        page,
        limit,
        startDate,
        endDate,
      );

    res.render("account/myOrders", {
      user,
      wishlistCount,
      cartCount,
      categories,
      orders,
      search,
      totalPages,
      currentPage,
      session: req.session,
      activePage: "myorders",
      startDate,
      endDate,
    });
  } catch (error) {
    next(error);
  }
};
const loadOrderDetails = async (req, res, next) => {
  try {
    const { orderId, itemId } = req.params;

    const { wishlistCount, cartCount, categories } =
      await getCommonHeaderData(req);
    const user = await userService.getUserById(req.session.user.id);
    const userId = req.session.user.id;
    const order = await orderService.getOrderByIdAndUser(orderId, userId);
    if (!order) {
      return res.redirect("/profile/myorders");
    }

    const item = order.items.id(itemId);
    const address = order.user.addresses.id(order.shippingAddress);

   
    // if(order.paymentStatus === 'Completed' || order.paymentStatus ==='Refunded'){
    //   console.log('haaa')
    //   item.paymentStatus = 'Completed'
    // }
 
// console.log(item.paymentStatus)

    // Calculate proportional coupon discount for this specific item
    const orderSubtotal = order.items.reduce(
      (acc, i) => acc + i.price * i.quantity,
      0,
    );
    const itemTotal = item.price * item.quantity;
    const itemCouponDiscount =
      orderSubtotal > 0
        ? Math.round((itemTotal / orderSubtotal) * (order.couponDiscount || 0))
        : 0;
    const finalItemAmount = itemTotal - itemCouponDiscount;

    res.render("account/orderDetails", {
      order,
      item,
      address,
      session: req.session,
      wishlistCount,
      cartCount,
      categories,
      itemTotal,
      itemCouponDiscount,
      finalItemAmount,
      search: "",
      activePage: "orderDetails",
      user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  loadWallet,
  downloadInvoice,
  cancelOrderItem,
  returnOrderItem,
  placeOrder,
  applyCouponAjax,
  loadOrderSuccess,
  loadMyOrders,
  loadOrderDetails,
};
