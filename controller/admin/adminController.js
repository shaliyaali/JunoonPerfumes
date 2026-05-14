
const Admin = require("../../model/adminSchema");
const User = require("../../model/userSchema");
const adminService = require('../../services/adminService');
const Order=require('../../model/orderSchema');
const Product = require('../../model/productSchema');
const Category = require('../../model/categorySchema');



const loadLogin = async (req, res) => {
  try {
    res.render("login", { message: null });
  } catch (error) {
    console.log(error);
  }
};

const verifyLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await adminService.verifyAdmin(email, password);

    if (admin) {
      req.session.admin ={
        id: admin._id,
        name: admin.name,
        email: admin.email

      } 
      res.redirect("/admin/dashboard");
    } else {
      // Generic message for security
      res.render("login", { message: "Invalid email or password" });
    }
  } catch (error) {
    console.log(error);
    res.render("login", { message: "Something went wrong" });
  }
};

const loadDashboard = async (req, res, next) => {
    try {
        const { reportFilter, startDate, endDate } = req.query;
        const filter = reportFilter || 'this_month';

        let dateQuery = {};
        const now = new Date();

        // Calculate date ranges (Matching your reports logic)
        if (filter === 'today') {
            dateQuery = { $gte: new Date(now.setHours(0, 0, 0, 0)), $lte: new Date(now.setHours(23, 59, 59, 999)) };
        } else if (filter === 'this_week') {
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
            dateQuery = { $gte: startOfWeek.setHours(0, 0, 0, 0), $lte: new Date() };
        } else if (filter === 'this_month') {
            dateQuery = { $gte: new Date(now.getFullYear(), now.getMonth(), 1), $lte: new Date() };
        } else if (filter === 'this_year') {
            dateQuery = { $gte: new Date(now.getFullYear(), 0, 1), $lte: new Date() };
        } else if (filter === 'custom' && startDate && endDate) {
            dateQuery = { $gte: new Date(startDate), $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) };
        } else {
            // Default: this month
            dateQuery = { $gte: new Date(now.getFullYear(), now.getMonth(), 1), $lte: new Date() };
        }

        const matchQuery = { 
            orderDate: dateQuery, 
            status: { $nin: ['Cancelled', 'Returned'] },
            paymentStatus: { $nin: ['Failed', 'Refunded'] }
        };

        // 1. Top Cards Data
        const totalOrders = await Order.countDocuments(matchQuery);
        const totalUsers = await User.countDocuments();
        const totalSalesAmount = (await Order.aggregate([{ $match: matchQuery }, { $group: { _id: null, total: { $sum: "$totalAmount" } } }]))[0]?.total || 0;
        const totalCustomers = (await Order.distinct('user', matchQuery)).length;

        // 2. Revenue Overview (Line Graph Data - Grouped by Date)
        const revenueData = await Order.aggregate([
            { $match: matchQuery },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$orderDate" } }, total: { $sum: "$totalAmount" } } },
            { $sort: { "_id": 1 } }
        ]);

        // 3. Order Summary (Bar Graph Data - Grouped by Status)
        const orderSummaryData = await Order.aggregate([
            { $match: { orderDate: dateQuery } }, // Include all statuses for bar chart summary
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        // 4. Top Selling Categories (Pie Chart)
        const topCategories = await Order.aggregate([
            { $match: matchQuery },
            { $unwind: "$items" },
            { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'productDetails' } },
            { $unwind: "$productDetails" },
            { $lookup: { from: 'categories', localField: 'productDetails.category', foreignField: '_id', as: 'categoryDetails' } },
            { $unwind: "$categoryDetails" },
            { $group: { _id: "$categoryDetails.name", count: { $sum: "$items.quantity" } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        // 5. Top 3 Selling Products
        const topProducts = await Order.aggregate([
            { $match: matchQuery },
            { $unwind: "$items" },
            { $group: { 
                _id: "$items.product", 
                name: { $first: "$items.productName" }, 
                image: { $first: "$items.productImage" },
                totalSold: { $sum: "$items.quantity" },
                revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
            } },
            { $sort: { totalSold: -1 } },
            { $limit: 3 }
        ]);

        res.render('dashboard', {
            totalOrders,
            totalUsers,
            totalSalesAmount,
            totalCustomers,
            revenueData,
            orderSummaryData,
            topCategories,
            topProducts,
            reportFilter: filter,
            startDate: startDate || '',
            endDate: endDate || ''
        });
    } catch (error) {
        next(error);
    }
};

const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log(err);
        return res.redirect('/admin/dashboard');
      }
      res.redirect("/admin/login");
    });
  } catch (error) {
    console.log(error);
  }
};

const manageUser = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const status = req.query.status || "all";
    const limit = 10;

    const query = {
      isAdmin: { $ne: true },
      $or: [
        { name: { $regex: ".*" + search + ".*", $options: "i" } },
        { email: { $regex: ".*" + search + ".*", $options: "i" } },
      ],
    };

    if (status === "active") {
      query.isBlocked = false;
    } else if (status === "blocked") {
      query.isBlocked = true;
    }

    const users = await adminService.getUsers(query, page, limit);
    const count = await adminService.countUsers(query);

    res.render("usermanagement", {
      users,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      search,
      status,
      userCount: count,
      activePage: 'users'
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("An error occurred while fetching users.");
  }
}

const blockCustomer = async (req, res) => {
  try {
    const id = req.query.id;
    await adminService.blockUserById(id);
    res.redirect("/admin/usermanagement");
  } catch (error) {
    console.log(error);
  }
};

const unblockCustomer = async (req, res) => {
  try {
    const id = req.query.id;
    await adminService.unblockUserById(id);
    res.redirect("/admin/usermanagement");
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  loadLogin,
  verifyLogin,
  loadDashboard,
  logout,
  manageUser,
  blockCustomer,
  unblockCustomer
}
