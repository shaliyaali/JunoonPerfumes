const Admin = require("../model/adminSchema");
const User = require("../model/userSchema");
const bcrypt = require("bcrypt");

const verifyAdmin = async (email, password) => {
    const admin = await Admin.findOne({ email });

    if (!admin) {
        return null;
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);
    return passwordMatch ? admin : null;
};

const getUsers = async (query, page, limit) => {
    return await User.find(query)
        .sort({ _id: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .exec();
};

const countUsers = async (query) => {
    return await User.countDocuments(query);
};

const blockUserById = async (id) => {
    return await User.updateOne({ _id: id }, { $set: { isBlocked: true } });
};

const unblockUserById = async (id) => {
    return await User.updateOne({ _id: id }, { $set: { isBlocked: false } });
};

module.exports = {
    verifyAdmin,
    getUsers,
    countUsers,
    blockUserById,
    unblockUserById,
};