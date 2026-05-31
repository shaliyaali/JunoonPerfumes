const Coupon = require('../model/couponSchema');

const getCoupons = async (query = {}, page = 1, limit =8) => {
    const skip = (page - 1) * limit;
    const coupons = await Coupon.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
    
    const totalCoupons = await Coupon.countDocuments(query);
    
    return {
        coupons,
        totalPages: Math.ceil(totalCoupons / limit),
        currentPage: page,
        totalCoupons
    };
};

const addCoupon = async (couponData) => {
    const existing = await Coupon.findOne({ code: couponData.code.toUpperCase() });
    if (existing) throw new Error('Coupon code already exists');
    
    const newCoupon = new Coupon(couponData);
    return await newCoupon.save();
};

const updateCoupon = async (id, updateData) => {
    const existing = await Coupon.findOne({ 
        code: updateData.code.toUpperCase(), 
        _id: { $ne: id } 
    });
    if (existing) throw new Error('Coupon code already exists');

    return await Coupon.findByIdAndUpdate(id, updateData, { new: true });
};

const deleteCoupon = async (id) => {
    return await Coupon.findByIdAndUpdate(id,{status:'Inactive'});
};

const getCouponById = async (id) => {
    return await Coupon.findById(id);
};

module.exports = {
    getCoupons,
    addCoupon,
    updateCoupon,
    deleteCoupon,
    getCouponById
};
