const express=require('express')
const router=express.Router()
const adminController=require('../controller/admin/adminController')
const categoryController=require('../controller/admin/categoryController')  
const productController=require('../controller/admin/productController')
const adminauth=require('../middlewares/adminauth')
const upload=require('../middlewares/upload')
const adminOrderController=require('../controller/admin/adminOrderController')
const couponController=require('../controller/admin/couponController')
const reportController = require('../controller/admin/reportController');



router.get('/login',adminauth.isLogin, adminController.loadLogin)
router.post('/login',adminController.verifyLogin)
router.get('/dashboard',adminauth.checkSession,adminController.loadDashboard)
router.get('/usermanagement',adminauth.checkSession,adminController.manageUser)
router.get('/logout',adminController.logout)
router.get('/block-customer',adminauth.checkSession,adminController.blockCustomer)
router.get('/unblock-customer',adminauth.checkSession,adminController.unblockCustomer)

router.get('/', adminauth.checkSession, (req, res) => {
    res.redirect('/admin/dashboard');
})
//category management
router.get('/categoryManagement',adminauth.checkSession ,categoryController.manageCategory)
router.post('/addCategory',adminauth.checkSession,categoryController.addCategory)
router.patch('/editCategory/:id',adminauth.checkSession,categoryController.editCategory)
router.post('/deleteCategory/:id',adminauth.checkSession,categoryController.deleteCategory)  
//product management  
router.get('/productManagement',adminauth.checkSession,productController.manageProduct)
router.get('/addProduct', adminauth.checkSession,productController.loadAddProduct)
router.post('/addProduct', upload.array('images', 5),adminauth.checkSession, productController.addProduct)
router.get('/editProduct/:id',adminauth.checkSession, productController.loadEditProduct)
router.post('/editProduct/:id', upload.array('images', 5),adminauth.checkSession, productController.editProduct)
router.post('/deleteProduct/:id',adminauth.checkSession, productController.deleteProduct)

//order management
router.get('/orders', adminauth.checkSession, adminOrderController.loadOrders);
router.get('/orders/:orderId', adminauth.checkSession, adminOrderController.loadOrderDetails);
router.post('/orders/update-item-status', adminauth.checkSession, adminOrderController.changeItemStatus)

// Coupon Management
router.get('/coupons', adminauth.checkSession, couponController.loadCouponManagement);
router.post('/coupons/add', adminauth.checkSession, couponController.addCoupon);
router.get('/coupons/data/:id', adminauth.checkSession, couponController.getCouponData);
router.patch('/coupons/edit/:id', adminauth.checkSession, couponController.editCoupon);
router.delete('/coupons/delete/:id', adminauth.checkSession, couponController.deleteCoupon);

//sales Report
router.get('/reports',adminauth.checkSession,reportController.loadSalesReport);
router.get('/reports/export/pdf', adminauth.checkSession, reportController.exportPDF);
router.get('/reports/export/excel', adminauth.checkSession, reportController.exportExcel);

module.exports=router
