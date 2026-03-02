
const Admin = require("../model/adminSchema");
const User = require("../model/userSchema");
const adminService = require('../services/adminService');

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

const loadDashboard = async (req, res) => {
  try {
    res.render("dashboard");
  } catch (error) {
    console.log(error);
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
