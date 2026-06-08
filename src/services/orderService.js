const mongoose = require("mongoose");
const Order = require("../model/orderSchema");
const Cart = require("../model/cartSchema");
const Product = require("../model/productSchema");
const User = require("../model/userSchema");
const Wallet = require("../model/walletSchema");

const createOrder = async (
  userId,
  addressId,
  paymentMethod,
  couponDiscount = 0,
  shippingCharge = 0,
  couponCode = null,
) => {
  const cart = await Cart.findOne({ user: userId }).populate("items.product");
  if (!cart || cart.items.length === 0) {
    throw new Error("Cart is empty.");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found.");
  }

  const shippingAddress = user.addresses.id(addressId);
  if (!shippingAddress) {
    throw new Error("Shipping address not found.");
  }

  // // 1. Calculate Total Amount First
  // const subtotal = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  // let totalAmount = Math.max(0, subtotal - couponDiscount);
  let totalAmount = 0;


  // 2. Determine Initial Payment Status
  let paymentStatus = "Pending";

  if (paymentMethod === "Wallet") {
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet || wallet.balance < totalAmount) {
      throw new Error("Insufficient wallet balance to complete this purchase.");
    }
    wallet.balance -= totalAmount;
    wallet.transactions.push({
      amount: totalAmount,
      type: "Debit",
      description: `Purchase payment for Order`,
      date: new Date(),
    });
    await wallet.save();
    paymentStatus = "Completed";
  }

  const orderItems = [];

  // 3. Process Items & Deduct Stock
  for (const cartItem of cart.items) {
    const product = cartItem.product;
    const variant = product.variants.id(cartItem.variantId);

    if (
      !product ||
      product.status !== "Active" ||
      !variant ||
      variant.stock < cartItem.quantity
    ) {
      throw new Error(
        `Product ${product ? product.name : "unknown"} (Size: ${variant ? variant.size : "unknown"}) is out of stock or unavailable.`,
      );
    }

    // Deduct stock
    await Product.updateOne(
      { _id: product._id, "variants._id": variant._id },
      { $inc: { "variants.$.stock": -cartItem.quantity } },
    );

    totalAmount += cartItem.price * cartItem.quantity;

    orderItems.push({
      product: product._id,
      variantId: variant._id,
      quantity: cartItem.quantity,
      price: cartItem.price,
      variantSize: variant.size,
      productName: product.name,
      productImage: product.images[0],
      paymentStatus: paymentStatus 
    });
  }

  const newOrder = new Order({
    user: userId,
    shippingAddress: shippingAddress._id, // Store the _id of the subdocument
    items: orderItems,
    totalAmount: totalAmount,
    paymentMethod: paymentMethod,
    couponDiscount: couponDiscount,
    shippingCharge: shippingCharge,
    paymentStatus: paymentStatus,
    couponCode: couponCode,
  });

  await newOrder.save();

  return newOrder;
};

const getOrderById = async (orderId) => {
  return await Order.findOne({ orderId: orderId }).populate("user").populate({
    path: "items.product",
    model: "Product",
  });
};

const getOrderByIdAndUser = async (orderId, userId) => {
  return await Order.findOne({ orderId: orderId, user: userId }).populate(
    "user",
  );
};

const getOrdersByUser = async (
  userId,
  search = "",
  page = 1,
  limit = 2,
  startDate = "",
  endDate = "",
) => {
  // Ensure userId is a proper ObjectId for query reliability
  const userObjectId = new mongoose.Types.ObjectId(userId);
  let query = { user: userObjectId };

  if (search && search.trim()) {
    const searchRegex = { $regex: search.trim(), $options: "i" };

    query.$or = [
      { orderId: searchRegex },
      { "items.productName": searchRegex },
    ];
  }
  if (startDate || endDate) {
    query.orderDate = {};
    if (startDate) {
      query.orderDate.$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.orderDate.$lte = end;
    }
  }

  const skip = (page - 1) * limit;

  const orders = await Order.find(query)
    .sort({ orderDate: -1 })
    .populate("user")
    .populate({
      path: "items.product",
      model: "Product",
    })
    .skip(skip)
    .limit(limit);

  const totalOrders = await Order.countDocuments(query);

  return {
    orders,
    totalPages: Math.ceil(totalOrders / limit),
    currentPage: page,
  };
};

const getAllOrdersAdmin = async (
  page = 1,
  limit = 10,
  search = "",
  startDate = "",
  endDate = "",
) => {
  const skip = (page - 1) * limit;
  let query = {};

  // Advanced search for OrderID or User Name
  if (search) {
    const userIds = await User.find({
      name: { $regex: search, $options: "i" },
    }).distinct("_id");
    query.$or = [
      { orderId: { $regex: search, $options: "i" } },
      { user: { $in: userIds } },
    ];
  }
  if (startDate || endDate) {
    query.orderDate = {};
    if (startDate) {
      query.orderDate.$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.orderDate.$lte = end;
    }
  }

  const orders = await Order.find(query)
    .populate("user", "name email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalOrders = await Order.countDocuments(query);

  return {
    orders,
    totalOrders,
    totalPages: Math.ceil(totalOrders / limit),
    currentPage: page,
  };
};

// const updateOrderStatus = async (
//   orderId,
//   status,
//   paymentStatus,
//   reason = null,
// ) => {
//   const order = await Order.findOne({ orderId });
//   if (!order) throw new Error("Order not found");

//   // 7-day limit for whole order cancellation
//   const sevenDays = 7 * 24 * 60 * 60 * 1000;
//   if (
//     (status === "Cancelled" || status === "Returned") &&
//     Date.now() - new Date(order.orderDate).getTime() > sevenDays
//   ) {
//     throw new Error("Action period (7 days) has expired.");
//   }

//   // If transitioning to Cancelled, restore stock to inventory
//   if (
//     status === "Cancelled" &&
//     order.status !== "Cancelled" &&
//     order.status !== "Delivered"
//   ) {
//     for (const item of order.items.filter(
//       (i) => i.status !== "Cancelled" && i.status !== "Returned",
//     )) {
//       await Product.updateOne(
//         { _id: item.product, "variants._id": item.variantId },
//         { $inc: { "variants.$.stock": item.quantity } },
//       );
//     }
//   }

//   // Refund to wallet if whole order is cancelled/returned and payment was completed
//   if (
//     (status === "Cancelled" || status === "Returned") &&
//     order.status !== "Cancelled" &&
//     order.status !== "Returned" &&
//     order.paymentStatus === "Completed"
//   ) {
//     const orderSubtotal = order.items.reduce(
//       (acc, i) => acc + i.price * i.quantity,
//       0,
//     );
//     const activeItems = order.items.filter(
//       (i) => i.status !== "Cancelled" && i.status !== "Returned",
//     );

//     // Calculate the refund amount based on remaining active items minus their share of the coupon
//     let refundAmount = 0;
//     activeItems.forEach((item) => {
//       const itemTotal = item.price * item.quantity;
//       const itemCouponDiscount =
//         orderSubtotal > 0
//           ? Math.round(
//               (itemTotal / orderSubtotal) * (order.couponDiscount || 0),
//             )
//           : 0;
//       refundAmount += itemTotal - itemCouponDiscount;
//     });

//     // Include the shipping charge in the full order refund
//     // refundAmount += order.shippingCharge || 0;

//     await Wallet.findOneAndUpdate(
//       { user: order.user },
//       {
//         $inc: { balance: refundAmount },
//         $push: {
//           transactions: {
//             amount: refundAmount,
//             type: "Credit",
//             description: `Full Refund for Cancelled Order: ${order.orderId}`,
//             date: new Date(),
//           },
//         },
//       },
//       { upsert: true },
//     );
//     order.paymentStatus = "Refunded";
//   }

//   const updateData = { status };
//   if (paymentStatus) {
//     updateData.paymentStatus = paymentStatus;
//   } else if (status === "Delivered") {
//     updateData.paymentStatus = "Completed";
//   } else if (status === "Cancelled" || status === "Returned") {
//     // If logic above set it to Refunded, keep it. Otherwise handle COD failure vs Online state.
//     updateData.paymentStatus =
//       order.paymentStatus === "Refunded"
//         ? "Refunded"
//         : order.paymentMethod === "COD"
//           ? "Failed"
//           : order.paymentStatus;
//   }

//   order.status = updateData.status;
//   if (updateData.paymentStatus) order.paymentStatus = updateData.paymentStatus;
//   if (reason) order.cancelReason = reason;

//   return await order.save();
// };

const updateOrderItemStatus = async (
  orderId,
  itemId,
  status,
  reason = null,
) => {
  const order = await Order.findOne({ orderId });
  if (!order) throw new Error("Order not found");

  const item = order.items.id(itemId);
  if (!item) throw new Error("Item not found in order");

 
  // 7-day limit check
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  if (
    (status === "Cancelled" || status === "Return Requested") &&
    Date.now() - new Date(order.orderDate).getTime() > sevenDays
  ) {
    throw new Error("This action allowed only after 7-days .");
  }

  const oldStatus = item.status;
  item.status = status;
  if (reason) item.reason = reason;

  // Handle stock for item cancellation/return
  if (
    (status === "Cancelled" || status === "Returned") &&
    oldStatus !== "Cancelled" &&
    oldStatus !== "Returned"
  ) {
    // Condition: If returned due to damage, do NOT increase stock
    const isDamaged =
      reason === "Damaged or leaking bottle" ||
      item.reason === "Damaged or leaking bottle";

    if (status === "Cancelled" || (status === "Returned" && !isDamaged)) {
      await Product.updateOne(
        { _id: item.product, "variants._id": item.variantId },
        { $inc: { "variants.$.stock": item.quantity } },
      );
    }
  }

  // Wallet Refund Logic for individual items
  if (
    (status === "Cancelled" || status === "Returned") &&
    item.paymentStatus === "Completed"
  ) {
    const orderSubtotal = order.items.reduce(
      (acc, i) => acc + i.price * i.quantity,
      0,
    );
    const itemTotal = item.price * item.quantity;
    const itemCouponDiscount =
      orderSubtotal > 0
        ? Math.round((itemTotal / orderSubtotal) * (order.couponDiscount || 0))
        : 0;
    const refundAmount = itemTotal - itemCouponDiscount;

    await Wallet.findOneAndUpdate(
      { user: order.user },
      {
        $inc: { balance: refundAmount },
        $push: {
          transactions: {
            amount: refundAmount,
            type: "Credit",
            description: `Refund for ${status} Item in Order: ${order.orderId}`,
          },
        },
      },
      { upsert: true },
    );
    item.paymentStatus = "Refunded";
  }

  // Recalculate Overall Order Status
  const allItems = order.items;
  const activeItems = allItems.filter(
    (i) => i.status !== "Cancelled" && i.status !== "Returned",
  );
  const deliveredItems = activeItems.filter((i) => i.status === "Delivered");

  if (activeItems.length > 0) {
    if (deliveredItems.length === activeItems.length) {
      order.status = "Delivered";
      order.paymentStatus = "Completed";
    } else if (deliveredItems.length > 0) {
      order.status = "Partially Delivered";
    } else {
      if (
        order.paymentStatus === "Completed" ||
        order.paymentStatus === "Refunded"
      ) {
        order.paymentStatus = "Refunded";
      }
    }
  }

  return await order.save();
};

module.exports = {
  createOrder,
  getOrderById,
  getOrdersByUser,
  getAllOrdersAdmin,
  //updateOrderStatus,
  updateOrderItemStatus,
  getOrderByIdAndUser,
};
