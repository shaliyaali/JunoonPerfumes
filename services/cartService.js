const Cart = require('../model/cartSchema');
const Product = require('../model/productSchema');

const getCart = async (userId) => {
    console.log('inside get cart')
    return await Cart.findOne({ user: userId }).populate('items.product');
};

const addToCart = async (userId, productId, variantId, quantity = 1) => {
    const product = await Product.findById(productId).populate('category');
    if (!product || product.status !== 'Active') throw new Error('Product not available');

    const variant = product.variants.id(variantId);
    if (!variant) throw new Error('Selected size not found');

    if (variant.stock <= 0) throw new Error('Out of stock');

    // Offer Logic: Product vs Category (apply whichever is greater)
    const productOffer = product.offer || 0;
    const categoryOffer = (product.category && product.category.offer) ? product.category.offer : 0;
    const bestOffer = Math.max(productOffer, categoryOffer);
    
    const finalUnitPrice = Math.round(variant.price * (1 - bestOffer / 100));

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
        cart = new Cart({ user: userId, items: [] });
    }

    const existingItemIndex = cart.items.findIndex(item => 
        item.product.toString() === productId.toString() && 
        item.variantId.toString() === variantId.toString()
    );

    if (existingItemIndex > -1) {
        const newQuantity = cart.items[existingItemIndex].quantity + parseInt(quantity);
        
        if (newQuantity > 5) throw new Error('Maximum 5 units allowed per fragrance');
        if (newQuantity > variant.stock) throw new Error('Cannot exceed available stock');

        cart.items[existingItemIndex].quantity = newQuantity;
        cart.items[existingItemIndex].price = finalUnitPrice; // Update to current best price
    } else {
        if (quantity > 5) throw new Error('Maximum 5 units allowed per fragrance');
        if (quantity > variant.stock) throw new Error('Requested quantity exceeds stock');

        cart.items.push({
            product: productId,
            variantId: variantId,
            quantity: parseInt(quantity),
            price: finalUnitPrice
        });
    }

    return await cart.save();
};

const updateQuantity = async (userId, productId, variantId, change) => {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) throw new Error('Cart not found');

    const itemIndex = cart.items.findIndex(item => 
        item.product.toString() === productId.toString() && 
        item.variantId.toString() === variantId.toString()
    );

    if (itemIndex === -1) throw new Error('Item not in cart');

    const newQuantity = cart.items[itemIndex].quantity + change;
    if (newQuantity < 1) throw new Error('Minimum quantity is 1');
    if (newQuantity > 5) throw new Error('Maximum 5 units allowed per fragrance');

    const product = await Product.findById(productId);
    const variant = product.variants.id(variantId);
    if (newQuantity > variant.stock) throw new Error('Insufficient stock available');

    cart.items[itemIndex].quantity = newQuantity;
    await cart.save();

    const subtotal = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    return { quantity: newQuantity, itemTotal: cart.items[itemIndex].price * newQuantity, subtotal };
};

const removeItem = async (userId, productId, variantId) => {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) throw new Error('Cart not found');

    cart.items = cart.items.filter(item => 
        !(item.product.toString() === productId.toString() && item.variantId.toString() === variantId.toString())
    );

    await cart.save();
    const subtotal = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    return { subtotal, count: cart.items.length };
};

module.exports = { addToCart, getCart, updateQuantity, removeItem };