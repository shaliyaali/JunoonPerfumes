
// const Admin = require("../../model/adminSchema");
// const User = require("../../model/userSchema");
const categoryService = require('../../services/categoryService');
const slugify = require('slugify');


const manageCategory=async (req, res) => 
  
  {
  try {
    const message = req.session.message;
    delete req.session.message;
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
  categoryCount: count,
  message
}
  )
   
  } catch (error) {
    console.log(error)
    res.redirect('/admin/dashboard')

  }
}

const addCategory=async(req,res)=>{
  try{
  const { name, offer, status } = req.body;

  if (!name || name.trim() === "") {
    req.session.message = "Category name is required";
    return res.redirect('/admin/categoryManagement');
  }
 
  const slug = slugify(name, { lower: true, strict: true });
  const categoryOffer = parseFloat(offer) || 0;

  await categoryService.addCategory(name, categoryOffer, slug, status);
  req.session.message = "Category added successfully";
  res.redirect('/admin/categoryManagement');
  }
  catch(error){
    console.error("Add Category Error:", error.message);
    req.session.message = error.message.includes("exists") 
        ? "Category with this name already exists" 
        : "Failed to add category";
    res.redirect('/admin/categoryManagement');
  }
}
const deleteCategory=async(req,res)=>{
  try{
    const id=req.params.id
    await categoryService.softDeleteCategory(id)
    req.session.message="Category deleted successfully"
    res.redirect('/admin/categoryManagement')
}
catch(error){
  console.log(error)
  res.redirect('/admin/categoryManagement')

}
}
const editCategory=async(req,res,next)=>{
  try{
    const id=req.params.id
    const { name, offer, status } = req.body;


    
    if (!name || name.trim() === "") {
      return res.status(400).json({ success: false, message: "Category name is required" });
    }

    const slug = slugify(name, { lower: true, strict: true });
    const categoryOffer = parseFloat(offer) || 0;

    await categoryService.editCategory(id, name, categoryOffer, slug, status);
    res.json({ success: true, message: "Category updated successfully" });
  }
  
  catch(error){
   next(error)
}
}
module.exports={manageCategory,addCategory,deleteCategory,editCategory}    