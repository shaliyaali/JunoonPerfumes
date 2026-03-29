const express=require('express')
const router=express.Router()
const adminController=require('../controller/admin/adminController')
const categoryController=require('../controller/admin/categoryController')  
const productController=require('../controller/admin/productController')
const adminauth=require('../middlewares/adminauth')
const upload=require('../middlewares/upload')



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
router.get('/categoryManagement', categoryController.manageCategory)
router.post('/addCategory',categoryController.addCategory)
router.post('/editCategory/:id',categoryController.editCategory)
router.post('/deleteCategory/:id',categoryController.deleteCategory)  
//product management  
router.get('/productManagement',productController.manageProduct)
router.get('/addProduct', productController.loadAddProduct)
router.post('/addProduct', upload.array('images', 5), productController.addProduct)
router.get('/editProduct/:id', productController.loadEditProduct)
router.post('/editProduct/:id', upload.array('images', 5), productController.editProduct)
router.post('/deleteProduct/:id', productController.deleteProduct)

module.exports=router