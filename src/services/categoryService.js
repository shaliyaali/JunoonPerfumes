

const Category = require("../model/categorySchema");
const Product = require("../model/productSchema");

const getCategoriesWithProductCount = async (query, page, limit) => {
  return await Category.aggregate([
    { $match: query },

    {
      $lookup: {
        from: "products",        
        localField: "_id",
        foreignField: "category",
        as: "products"
      }
    },

    {
      $addFields: {
        productCount: { $size: "$products" }
      }
    },

    { $sort: { createdAt: -1 } },

    { $skip: (page - 1) * limit },

    { $limit: limit }
  ]);
};
const countCategories=async(query)=>{
  return await Category.countDocuments(query)
}

const addCategory=async(name,offer,slug,status)=>{

  const existingCategory = await Category.findOne({
    name: { $regex: `^${name}$`, $options: "i" }
  });

  if (existingCategory) {
    throw new Error("Category already exists");
  }

  const category = new Category({
    name,
    offer,
    slug,
    status: status || 'Active'
  });

  return await category.save();
};
const softDeleteCategory=async(id)=>{
  await Category.findByIdAndUpdate(id,{status:'Inactive'})
}
const editCategory=async(id,name,offer,slug,status)=>{
  const existingCategory = await Category.findOne({
    name: { $regex: `^${name}$`, $options: "i" },
    _id: { $ne: id }
  });

  if (existingCategory) {
    throw new Error("Category already exists");
  }
  
  const updatedCategory = await Category.findByIdAndUpdate(id, { name, offer, slug, status }, { new: true });

  // Sync Product salePrices if the offer changed
  const products = await Product.find({ category: id });
  for (const product of products) {
    const productOffer = product.offer || 0;
    const categoryOffer = updatedCategory.offer || 0;
    const bestOffer = Math.max(productOffer, categoryOffer);

    product.variants = product.variants.map(v => ({
      ...v,
      salePrice: Math.round(v.price * (1 - bestOffer / 100))
    }));
    
    await product.save();
  }

  return updatedCategory;
}

const getAllActiveCategories = async () => {
  return await Category.find({ status: 'Active' }).sort({ name: 1 });
};

module.exports = { getCategoriesWithProductCount, countCategories, addCategory, softDeleteCategory, editCategory, getAllActiveCategories };
