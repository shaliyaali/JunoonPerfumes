const couponService=require('../../services/couponService')

const loadCouponManagement= async (req,res)=>{
  try{
    const message = req.session.message;
    delete req.session.message;

    const search=(req.query.search || '').trim();
    const statusFilter = req.query.status || 'all';
    const page = parseInt(req.query.page)|| 1;
    const limit =8;
    let query={}
    if(search){
      query.code={$regex: search, $options : 'i'}
    }

    const now=new Date()
    if(statusFilter === 'active'){
      query.status = 'Active';
      query.expiryDate = {$gte :now};
    }else if(statusFilter === 'inactive'){
      query.status ='Inactive'
    }else if(statusFilter === 'expired'){
      query.expiryDate = {$lte :now};
    }
    const {coupons,totalPages,currentPage}= await couponService.getCoupons(query,page,limit);   
    
    res.render('couponmanagement',{
      coupons,
      totalPages,
      currentPage,
      search,
      statusFilter,
      message,
      activePage: 'coupons'
    });
    }catch(error){
      console.error(error);
        res.redirect('/admin/dashboard');
    
    }
  }

  const addCoupon= async(req,res)=>{
    try{
      const { code, offerValue, minPurchase, expiryDate, offerType } = req.body;
      
      // validation
      const codeRegex = /^(?=.*\d).{6,}$/;
      if (!codeRegex.test(code)) throw new Error('Invalid coupon code format');
      if (!offerValue || offerValue <= 0) throw new Error('Invalid offer value');
      if (minPurchase === undefined || minPurchase < 0) throw new Error('Invalid minimum purchase');
      if (!expiryDate || new Date(expiryDate) < new Date().setHours(0,0,0,0)) throw new Error('Expiry date cannot be in the past');
     // console.log(minPurchase,offerValue)
      if (parseFloat(minPurchase) <= parseFloat(offerValue)) {
        throw new Error('Minimum purchase must be greater than the offer value');
      }

      await couponService.addCoupon(req.body)
      req.session.message="coupon added sucessfully";
      res.redirect('/admin/coupons')
    }catch(error){
       req.session.message = error.message;
        res.redirect('/admin/coupons');
    
    }
  }

  const editCoupon= async(req,res)=>{
    try{
      const {id} =req.params;
      const { code, offerValue, minPurchase, expiryDate, offerType } = req.body;


      const codeRegex = /^(?=.*\d).{6,}$/;
      if (code && !codeRegex.test(code)) throw new Error('Invalid coupon code format');
      if (offerValue !== undefined && offerValue <= 0) throw new Error('Invalid offer value');
      if (minPurchase !== undefined && minPurchase < 0) throw new Error('Invalid minimum purchase');
      if (expiryDate && new Date(expiryDate) < new Date().setHours(0,0,0,0)) throw new Error('Expiry date cannot be in the past');
      if (minPurchase !== undefined && offerValue !== undefined && parseFloat(minPurchase) <= parseFloat(offerValue)) {
        throw new Error('Minimum purchase must be greater than the offer value');
      }

      await couponService.updateCoupon(id,req.body);
      res.json({success: true,message:'coupon updated sucessfully'})
    }catch(error){
      res.status(400).json({ success: false, message: error.message });

      
    }
  }
  const deleteCoupon= async(req,res)=>{
    try{
      const {id} =req.params;
      await couponService.deleteCoupon(id);
      res.json({success: true,message:'Coupon deactivated successfully'})
    }catch(error){
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to deactivate coupon' });
  }
}

  const getCouponData = async (req,res,next)=>{
    try{
      const coupon=await couponService.getCouponById(req.params.id);
      res.json({success:true,coupon})
    }catch(error){
      res.status(404).json({ success: false, message: "Coupon not found" });

    }
  }
  module.exports={
    loadCouponManagement,
    addCoupon,
    editCoupon,
    deleteCoupon,
    getCouponData
  }
