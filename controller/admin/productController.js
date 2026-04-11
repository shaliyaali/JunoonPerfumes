const productService=require('../../services/productService')
const categoryService=require('../../services/categoryService')
const Category = require('../../model/categorySchema');
const slugify = require('slugify');
// const fs=require('fs')
// const path=require('path')

const manageProduct=async(req,res)=>{
  try{
    const message = req.session.message;
    delete req.session.message;

    const search=req.query.search||"";
    const page=parseInt(req.query.page)||1;
    const limit=10;
    const status=req.query.status || "all";
    const sortValue=req.query.sort || "";

    const query={name:{$regex:search,$options:"i"}}
    if(status === "active"){
      query.status="Active" 
    }
    else if(status === "inactive"){
      query.status='Inactive'
    }

    let sort = { createdAt: -1 };
    if (sortValue === 'stock_asc') sort = { totalStock: 1 };
    else if (sortValue === 'stock_desc') sort = { totalStock: -1 };

    const products=await productService.getProducts(query,page,limit,sort)
    const count=await productService.countProducts(query)

    res.render('productmanagement',{
      product: products,
      totalPages:Math.ceil(count/limit),
      currentPage:page,
      search,
      status,
      count,
      sort: sortValue,
      message
    })
  }catch(error){
    console.log(error)
    res.redirect('/admin/dashboard')

  }
}
const loadAddProduct=async(req,res)=>{
  try {
    const categories=await Category.find({status:'Active'})
    res.render('addproduct', { categories, product: null });

    
  } catch (error) {
    console.log("Error loading add product page:", error);
    res.redirect("/admin/dashboard")

  }


}

const addProduct = async (req, res) => {
  try {
    const { name, tagline, description, category, status, offer, notes, isFeatured } = req.body;
    let { variants } = req.body;

    // Cloudinary returns the secure URL in file.path
    const images = req.files ? req.files.map(file => file.path) : [];

    // Server-side Validation for Minimum 3 Images
    if (images.length < 3) {
        // If using connect-flash, you'd set a message here. 
        // For now, redirecting back or handling error.
        return res.status(400).send("Minimum 3 images are required."); 
    }

    if (variants && typeof variants === 'object') {
        variants = Object.values(variants);
    }

    const slug = slugify(name, { lower: true, strict: true });

    // Generate unique SKUs for each variant
    const variantsWithSku = variants.map((v) => {
      const randomStr = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
      const sizeCode = v.size.replace(/\s+/g, '').toUpperCase();
      return {
        ...v,
        sku: `${slug.toUpperCase()}-${sizeCode}-${randomStr}`
      };
    });

    const productData = {
      name,
      tagline,
      slug,
      description,
      category,
      status,
      offer,
      images,
      note: notes,
      isFeatured: isFeatured === 'on',
      variants: variantsWithSku
    };

    await productService.createProduct(productData);
    req.session.message = "Product added successfully";
    res.redirect('/admin/productManagement');
  } catch (error) {
    console.error("Error adding product:", error.message);
    if (error.message.includes("exists")) {
        req.flash('error_msg', error.message);
        return res.redirect('/admin/addProduct');
    }
    req.flash('error_msg', 'Something went wrong');
    res.status(500).redirect('/admin/addProduct');
  }
};

const loadEditProduct = async (req, res) => {
  try {
    const id = req.params.id;
    const product = await productService.getProductById(id);
   
    if (!product) throw new Error('Product not found')
    const categories = await Category.find({ status: 'Active' });

    res.render('addProduct', { categories, product });
  } catch (error) {
    console.error("Error loading edit product page:", error);
    res.redirect("/admin/productManagement");
  }
};

const editProduct = async (req, res) => {
  try {
    const id = req.params.id;
    const { name, tagline, description, category, status, offer, notes, isFeatured } = req.body;
    let { variants, existingImages } = req.body;

    if (variants && typeof variants === 'object') {
      variants = Object.values(variants);
    }

    // Handle existing images (ensure it's an array even if 0 or 1 remains)
    if (!existingImages) {
        existingImages = [];
    } else if (typeof existingImages === 'string') {
        existingImages = [existingImages];
    }

    const slug = slugify(name, { lower: true, strict: true });
    const newImages = req.files ? req.files.map(file => file.path) : [];

    // Generate unique SKUs for each variant
    const variantsWithSku = variants.map((v) => {
      const randomStr = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
      const sizeCode = v.size.replace(/\s+/g, '').toUpperCase();
      return {
        ...v,
        sku: `${slug.toUpperCase()}-${sizeCode}-${randomStr}`
      };
    });

    const updateData = {
      name,
      tagline,
      slug,
      description,
      category,
      status,
      offer,
      note: notes,
      isFeatured: isFeatured === 'on',
      variants: variantsWithSku,
      images: [...existingImages, ...newImages] // Merge kept images with new ones
    };

    // Server-side validation for minimum 3 images
    if (updateData.images.length < 3) {
        req.flash('error_msg', 'Minimum 3 images are required');
        return res.redirect(`/admin/editProduct/${id}`);
    }

    await productService.updateProduct(id, updateData);
    req.session.message = "Product updated successfully";
    res.redirect('/admin/productManagement');
  } catch (error) {

    console.error("Error editing product:", error.message);
    const id = req.params.id;
    if (error.message.includes("exists")) {
        req.flash('error_msg', error.message);
        return res.redirect(`/admin/editProduct/${id}`);
    }
    res.redirect('/admin/productManagement');
  }
};

const deleteProduct = async (req, res) => {
  try {
    await productService.softDeleteProduct(req.params.id);
    req.session.message = "Product deleted successfully";
    res.redirect('/admin/productManagement');
  } catch (error) {
    console.error("Error deleting product:", error);
    res.redirect('/admin/productManagement');
  }
};

module.exports={manageProduct,loadAddProduct,addProduct,loadEditProduct,editProduct,deleteProduct}