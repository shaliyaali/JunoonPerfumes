const productService=require('../services/productService')
const Category = require('../model/categorySchema');
const wishlistService = require('../services/wishlistService');

const loadAllfragrence = async (req, res) => {
  try {
    const { category, price, sort: sortValue, search, page, note } = req.query;
    const currentPage = parseInt(page) || 1;
    const limit =12;

    // 1. Fetch Active Categories for the header dropdown
    const categories = await Category.find({ status: 'Active' });

    // 2. Build the query object for products
    const query = { status: 'Active' };

    if (category) {
      const categoryIds = category.split(',');
      query.category = { $in: categoryIds };
    }

    if (note) {
      const notes = note.split(',');
      query.note = { $in: notes };
    }

    if (search) {
      console.log('search:', search)
      query.name = { $regex: search, $options: 'i' };
    }

    // 3. Handle Price Filtering logic based on your EJS radio button values
    if (price) {
      if (price === '0-1000') {
        query['variants.price'] = { $lt: 1000 };
      } else if (price === '1000-5000') {
        query['variants.price'] = { $gte: 1000, $lte: 5000 };
      } else if (price === '5000-above') {
        query['variants.price'] = { $gt: 5000 };
      }
    }

    // 4. Handle Sorting
    let sort = { createdAt: -1 }; // Default to newest
    if (sortValue === 'price_asc') {
      sort = { 'variants.price': 1 };
    } else if (sortValue === 'price_desc') {
      sort = { 'variants.price': -1 };
    }

    // 5. Fetch products (using a high limit for the full collection view)
    const products = await productService.getProducts(query, currentPage, limit, sort,search);

    // Get user's wishlist IDs
    let wishlistIds = [];
    if (req.session.user) {
        const items = await wishlistService.getWishlistByUser(req.session.user.id);
        wishlistIds = items.map(item => item.product._id.toString());
    }

    // If it's an AJAX request, return JSON
    if (req.query.ajax === 'true') {
        return res.json({ product: products, wishlistIds });
    }

    const count=await productService.countProducts(query )

    // 6. Render the view passing all necessary data
    res.render('account/allfragrence', {
      categories,
      product: products,
      session: req.session,
      wishlistIds,
      search,
      totalPages:Math.ceil(count/limit),
      currentPage
    });
  }
  catch (error) {
    console.log('allfragrence page not loading', error)
    res.status(500).send('server error')
  }
}
module.exports = { loadAllfragrence}