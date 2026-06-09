const productService=require('../../services/productService')
//const Category = require('../../model/categorySchema');
const wishlistService = require('../../services/wishlistService');
//const cartService = require('../../services/cartService');
const { getCommonHeaderData } = require('./userController');

const loadAllfragrence = async (req, res) => {
  try {
    const { category, price, sort: sortValue, search, page, note } = req.query;
    const currentPage = parseInt(page) || 1;
    const limit =6;

    const { wishlistCount, cartCount, categories } = await getCommonHeaderData(req);

    // 2. Build the query object for products
    const query = { status: 'Active' };

    if (category && typeof category === 'string' && category.trim() !== '') {
      const categoryIds = category.split(',').map(id => id.trim()).filter(id => id !== '');
      query.category = { $in: categoryIds };
    }

    if (note && typeof note === 'string' && note.trim() !== '') {
      const notes = note.split(',').map(n => n.trim()).filter(n => n !== '');
      query.note = { $in: notes };
    }

    if (search) {
      console.log('search:', search)
      query.name = { $regex: search, $options: 'i' };
    }

    // 3. Handle Price Filtering logic based on your EJS radio button values
    if (price) {
      if (price === '0-1000') {
        query.minPrice = { $lt: 1000 };
      } else if (price === '1000-5000') {
        query.minPrice = { $gte: 1000, $lte: 5000 };
      } else if (price === '5000-above') {
        query.minPrice = { $gt: 5000 };
      }
    }

    // 4. Handle Sorting
    let sort = { createdAt: -1 }; 
    if (sortValue === 'price_asc') {
      sort = { minPrice: 1 };
    } else if (sortValue === 'price_desc') {
      sort = { minPrice: -1 };
    }

    // 5. Fetch products using the pagination limit
    const products = await productService.getProducts(query, currentPage, limit, sort);

    // Get total count for pagination
    const count = await productService.countProducts(query);
    const totalPages = Math.ceil(count / limit);


    // Get user's wishlist IDs
    let wishlistIds = [];
    if (req.session.user) {
        const items = await wishlistService.getWishlistByUser(req.session.user.id);
        wishlistIds = items.map(item => item.product._id.toString());
    }

    // If it's an AJAX request, return JSON
    if (req.query.ajax === 'true') {
        return res.json({ product: products, wishlistIds, wishlistCount, cartCount ,totalPages,currentPage});
    }

   // const count=await productService.countProducts(query )

    // 6. Render the view passing all necessary data
    res.render('account/allfragrence', {
      categories,
      product: products,
      session: req.session,
      wishlistIds,
      wishlistCount,
      cartCount,
      search:search || '',
      sortValue:sortValue ||'',
      price:price ||'',
      category:category ||'',
      note:note ||'',
      selectedCategory:category || '',
      selectedNote:note || '',
      totalPages,
      currentPage
    });
  }
  catch (error) {
    console.log('allfragrence page not loading', error)
    res.status(500).send('server error')
  }
}
module.exports = { loadAllfragrence}