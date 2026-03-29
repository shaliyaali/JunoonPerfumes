

const Category = require("../model/categorySchema");

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

const addCategory=async(name,offer,slug)=>{

  const existingCategory = await Category.findOne({
    name: { $regex: `^${name}$`, $options: "i" }
  });

  if (existingCategory) {
    throw new Error("Category already exists");
  }

  const category = new Category({
    name,
    offer,
    slug
  });

  return await category.save();
};
const softDeleteCategory=async(id)=>{
  await Category.findByIdAndUpdate(id,{status:'Inactive'})
}
const editCategory=async(id,name,offer,slug)=>{
  await Category.findByIdAndUpdate(id,{name,offer,slug})
}

module.exports = { getCategoriesWithProductCount,countCategories,addCategory,softDeleteCategory,editCategory };
