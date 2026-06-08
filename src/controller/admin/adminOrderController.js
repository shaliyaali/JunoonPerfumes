const orderService = require("../../services/orderService");
const order = require("../../model/orderSchema");

const loadOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || "";
    const limit = 10;
    const startDate = req.query.startDate || "";
    const endDate = req.query.endDate || "";

    const { orders, totalPages, currentPage } =
      await orderService.getAllOrdersAdmin(
        page,
        limit,
        search,
        startDate,
        endDate,
      );
    res.render("orderManagement", {
      orders,
      totalPages,
      currentPage,
      search,
      startDate,
      endDate,
    });
  } catch (error) {
    console.error("Error loading admin orders:", error);
    res.status(500).send("Internal Server Error");
  }
};

const changeItemStatus = async (req, res) => {
  try {
    const { orderId, itemId, status, reason } = req.body;

    await orderService.updateOrderItemStatus(orderId, itemId, status, reason);
    res.json({ success: true, message: "Item status updated" });
  } catch (error) {
    console.error("Error updating item status:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const loadOrderDetails = async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.orderId);
    if (!order) return res.redirect("/admin/orders");
    const address = order.user.addresses.id(order.shippingAddress);
    res.render("orderDetails", { order, address });
  } catch (error) {
    console.error("Error loading order details:", error);
    res.redirect("/admin/orders");
  }
};

module.exports = { loadOrders, loadOrderDetails, changeItemStatus };
