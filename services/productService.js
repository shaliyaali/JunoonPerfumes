const category=require('../model/categorySchema')
const product=require('../model/productSchema')

const getProducts=async(query,page,limit,sort = { createdAt: -1 },search)=>{
  // If sorting by totalStock (sum of variants), we must use an aggregation pipeline
  if (sort.totalStock) {
    return await product.aggregate([
      { $match: query },
      { $addFields: { totalStock: { $sum: "$variants.stock" } } },
      {
        $lookup: {
          from: "categories", 
          localField: "category",
          foreignField: "_id",
          as: "category"
        }
      },
      { $unwind: "$category" },
      { $sort: sort },
      { $skip: (page - 1) * limit },
      { $limit: limit }
    ]);
  }

  // Default find logic
  return await product.find(query)
  .populate('category')
  .sort(sort)
  .limit(limit)
  .skip((page -1) * limit)
}
const countProducts=async(query)=>{
  return await product.countDocuments(query)
}

const createProduct = async (productData) => {
  const existingProduct = await product.findOne({
    name: { $regex: `^${productData.name}$`, $options: "i" }
  });

  if (existingProduct) {
    throw new Error("Product with this name already exists");
  }

  // Calculate salePrice for each variant
  const selectedCategory = await category.findById(productData.category);
  const categoryOffer = (selectedCategory && selectedCategory.offer) || 0;
  const productOffer = parseFloat(productData.offer) || 0;
  const bestOffer = Math.max(categoryOffer, productOffer);

  // Convert variants object to array if necessary and calculate prices
  const rawVariants = Array.isArray(productData.variants) 
    ? productData.variants 
    : Object.values(productData.variants || {});

  productData.variants = rawVariants.map(v => {
    const price = parseFloat(v.price) || 0;
    return {
      ...v,
      price: price,
      stock: parseInt(v.stock) || 0,
      salePrice: Math.round(price * (1 - bestOffer / 100))
    };
  });

  const newProduct = new product(productData);
  return await newProduct.save();
};

const getProductById = async (id) => {
  return await product.findById(id).populate('category');
};

const updateProduct = async (id, productData) => {
  // Check if another product already has this name (excluding current ID)
  const existingProduct = await product.findOne({
    name: { $regex: `^${productData.name}$`, $options: "i" },
    _id: { $ne: id }
  });

  if (existingProduct) {
    throw new Error("Product with this name already exists");
  }

  // Recalculate salePrice for each variant
  const selectedCategory = await category.findById(productData.category);
  const categoryOffer = (selectedCategory && selectedCategory.offer) || 0;
  const productOffer = parseFloat(productData.offer) || 0;
  const bestOffer = Math.max(categoryOffer, productOffer);

  const rawVariants = Array.isArray(productData.variants) 
    ? productData.variants 
    : Object.values(productData.variants || {});

  productData.variants = rawVariants.map(v => {
    const price = parseFloat(v.price) || 0;
    return {
      ...v,
      price: price,
      stock: parseInt(v.stock) || 0,
      salePrice: Math.round(price * (1 - bestOffer / 100))
    };
  });

  return await product.findByIdAndUpdate(id, productData, { new: true });
};

const softDeleteProduct = async (id) => {
  return await product.findByIdAndUpdate(id, { status: 'Inactive' });
};

module.exports={getProducts,countProducts,createProduct,getProductById,updateProduct,softDeleteProduct}