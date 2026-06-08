const Cart = require('../model/cartSchema');
const Product = require('../model/productSchema');

const getCart = async (userId, searchQuery = null) => {
   console.log('inside get cart') 
    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    if(!cart) return null
    let wasAdjusted=false;
    let updatedItems = cart.items.map(item=>{
        const product=item.product;
        if(!product) return {...item.toObject(), status:'out of stock', variantSize:'Product Deleted', stock: 0}

        let variant = product.variants.id(item.variantId);

        // HEALING LOGIC: If ID is orphaned, try matching by size string
        if (!variant && item.variantSize) {
            variant = product.variants.find(v => v.size === item.variantSize);
            if (variant) {
                item.variantId = variant._id; // Repair the link in memory
                wasAdjusted = true;
            }
        }
       
        let status= 'ok'
        if(!variant) 
        {
            status='out of stock'; 
        }
        else if(variant.stock === 0) {
            status='out of stock';
        }
        else if(variant.stock < item.quantity){
            item.quantity = variant.stock;
            status = 'limitted'; 
            wasAdjusted=true;
        }
        
        return {
            ...item.toObject(),
            quantity: item.quantity, 
            stock : variant ? variant.stock : 0,
            status,
            variantSize : variant ? variant.size : 'Size Unavailable'
        }
    })

    if (searchQuery && searchQuery.name && searchQuery.name.$regex) {
        const regex = new RegExp(searchQuery.name.$regex, 'i');
        updatedItems = updatedItems.filter(item => 
            item.product && item.product.name && regex.test(item.product.name)
        );
    }

    if(wasAdjusted) await cart.save();
    return {
        ...cart.toObject(),
        items:updatedItems
    }
};

const addToCart = async (userId, productId, variantId, quantity = 1) => {
    const product = await Product.findById(productId).populate('category');
    if (!product || product.status !== 'Active') throw new Error('Product not available');

    const variant = product.variants.id(variantId);
    if (!variant) throw new Error('Selected size not found');

    if (variant.stock <= 0) throw new Error('Out of stock');

    // Offer Logic: Product vs Category
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
    // This is the absolute maximum a user can ever have in their cart for this item
    const totalAllowedInCart = Math.min(5, variant.stock);
    let finalQuantityToAdd=parseInt(quantity)
    let message='Added to Shopping Bag '
    
    if (existingItemIndex > -1) {
        const currentQuantity = cart.items[existingItemIndex].quantity;
        let requestedTotalQuantity = currentQuantity + finalQuantityToAdd;

        // Compare total sum against the physical stock/business limit
        if (requestedTotalQuantity > totalAllowedInCart){
            finalQuantityToAdd = totalAllowedInCart - currentQuantity;
            if(finalQuantityToAdd < 0) finalQuantityToAdd = 0;
            requestedTotalQuantity = currentQuantity + finalQuantityToAdd;
            message = `Added ${finalQuantityToAdd} items. Maximum ${totalAllowedInCart} units allowed.`;
        }

        cart.items[existingItemIndex].quantity = requestedTotalQuantity;
        cart.items[existingItemIndex].price = finalUnitPrice; // Update to current best price
    } else {
        if(finalQuantityToAdd > totalAllowedInCart){
            finalQuantityToAdd = totalAllowedInCart;
            message = `Added ${finalQuantityToAdd} items. Maximum ${totalAllowedInCart} units allowed.`;
        }

        cart.items.push({
            product: productId,
            variantId: variantId,
            variantSize: variant.size,
            quantity: finalQuantityToAdd,
            price: finalUnitPrice
        });
    }

     await cart.save();
     return {cart,message};
};

const updateQuantity = async (userId, productId, variantId, change) => {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) throw new Error('Cart not found');

    const itemIndex = cart.items.findIndex(item => 
        item.product.toString() === productId.toString() && 
        item.variantId.toString() === variantId.toString()
    );
    if (itemIndex === -1) throw new Error('Item not found in cart');

    const item=cart.items[itemIndex];
    const product=await Product.findById(productId);
    
    if (!product) throw new Error('Product no longer exists');
    let variant = product.variants.id(variantId);

    // Allow reduction/removal of orphaned items without crashing
    if (!variant && change > 0) {
        throw new Error('This size is no longer available and cannot be increased.');
    }

    const stockLimit = variant ? variant.stock : 0;
    const maxAllowedQuantity = Math.min(5, stockLimit);
    const minAllowedQuantity =1;

    let requestedNewQuantity=item.quantity+change;
    let finalNewQuantity = Math.max(minAllowedQuantity,Math.min(requestedNewQuantity,maxAllowedQuantity ))
    let message='Cart Updated Sucessfully';

    if (finalNewQuantity !== requestedNewQuantity ){
        if(requestedNewQuantity > maxAllowedQuantity){
            message=`Quantity adjusted to ${finalNewQuantity}. Maximum ${maxAllowedQuantity} units  available.`
        }else if(requestedNewQuantity < minAllowedQuantity) {
            message=`Quantity adjusted to ${finalNewQuantity}. Minimum ${minAllowedQuantity} units allowed.`
        }
    }
    item.quantity=finalNewQuantity;
    await cart.save();
    
    const subtotal=cart.items.reduce((acc,cartItem)=> acc+ (cartItem.price * cartItem.quantity),0)

    const cartCount =cart.items.reduce((sum,cartItem)=> sum + cartItem.quantity , 0);
    return {
        quantity:finalNewQuantity,
        itemTotal:item.price*finalNewQuantity,
        subtotal,
        cartCount,
        message,
        stock: stockLimit
    }
    }
    
const removeItem = async (userId, productId, variantId) => {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) throw new Error('Cart not found');

    cart.items = cart.items.filter(item => 
        !(item.product.toString() === productId.toString() && item.variantId.toString() === variantId.toString())
    );

    await cart.save();
    const subtotal = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    return { subtotal, count: cartCount };
};

module.exports = { addToCart, getCart, updateQuantity, removeItem };