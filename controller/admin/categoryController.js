
// const Admin = require("../../model/adminSchema");
// const User = require("../../model/userSchema");
const categoryService = require('../../services/categoryService');
const slugify = require('slugify');


const manageCategory=async (req, res) => 
  
  {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const status = req.query.status || "all";
    const limit = 10;
  const query = {
    name: { $regex: search, $options: "i" }
};

if (status === "active") {
  query.status = "Active";
} else if (status === "inactive") {
  query.status = "Inactive";
}
const category=await categoryService.getCategoriesWithProductCount(query,page,limit)
const count=await categoryService.countCategories(query)
res.render('categorymanagement',{
  category,
  totalPages: Math.ceil(count / limit),
  currentPage: page,
  search,
  status,
  categoryCount: count
}
  )
   
  } catch (error) {
    console.log(error)
    res.redirect('/admin/dashboard')

  }
}

const addCategory=async(req,res)=>{
  try{
  const {name,offer}=req.body
 
const slug=slugify(name,{
  lower:true,
  strict:true
})
await categoryService.addCategory(name,offer,slug)
res.redirect('/admin/categoryManagement')

}

  catch(error){
    console.log(error);
    res.redirect("/admin/categoryManagement");
  }
}
const deleteCategory=async(req,res)=>{
  try{
    const id=req.params.id
    await categoryService.softDeleteCategory(id)
    res.redirect('/admin/categoryManagement')
}
catch(error){
  console.log(error)
  res.redirect('/admin/categoryManagement')

}
}
const editCategory=async(req,res)=>{
  try{
    const id=req.params.id
    const {name,offer}=req.body
    const slug=slugify(name,{
      lower:true,
      strict:true
    })
      await categoryService.editCategory(id,name,offer,slug)
      res.redirect('/admin/categoryManagement') 
      }
  
    catch(error){
      console.log(error) 
      res.redirect('/admin/categoryManagement')
    }
}
module.exports={manageCategory,addCategory,deleteCategory,editCategory}    