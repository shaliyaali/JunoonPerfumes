const orderService = require('../../services/orderService');

const loadOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const search = req.query.search || '';
        const status = req.query.status || 'all';
        const limit = 10;

        const { orders, totalPages, currentPage } = await orderService.getAllOrdersAdmin(page, limit, search, status);

        res.render('orderManagement', {
            orders,
            totalPages,
            currentPage,
            search,
            status
        });
    } catch (error) {
        console.error('Error loading admin orders:', error);
        res.status(500).send('Internal Server Error');
    }
};

const changeStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;
        await orderService.updateOrderStatus(orderId, status);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

const changeItemStatus = async (req, res) => {
    try {
        const { orderId, itemId, status } = req.body;
        await orderService.updateOrderItemStatus(orderId, itemId, status);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating item status:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

const loadOrderDetails = async (req, res) => {
    try {
        const order = await orderService.getOrderById(req.params.orderId);
        if (!order) return res.redirect('/admin/orders');
        res.render('orderDetails', { order });
    } catch (error) {
        console.error('Error loading order details:', error);
        res.redirect('/admin/orders');
    }
};

module.exports = { loadOrders, changeStatus, loadOrderDetails, changeItemStatus };