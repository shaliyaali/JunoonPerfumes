const express=require('express')
const router=express.Router()
const adminController=require('../controller/adminController')
const adminauth=require('../middlewares/adminauth')



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

module.exports=router