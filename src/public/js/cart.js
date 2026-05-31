
async function handleAddToCart(productId, variantId, quantity = 1) {
    if (!window.Junoon.isAuthenticated) {
        window.location.href = '/signin';
        return;
    }

    try {
        const response = await fetch('/cart/add', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ productId, variantId, quantity })
        });

        const data = await response.json();
        if (data.success) {
            const cartBadge = document.getElementById('cart-count');
            if (cartBadge) {
                cartBadge.textContent = data.cartCount;
                cartBadge.classList.remove('hidden');
            }
            Swal.fire({ icon: 'success', title: 'Added to Cart', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
        } else {
            Swal.fire({ icon: 'error', title: 'Action Failed', text: data.message });
        }
    } catch (error) {
        console.error('Cart error:', error);
    }
}

async function changeQuantity(productId, variantId, change) {
    try {
        const response = await fetch('/cart/update', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ productId, variantId, change })
        });

        const data = await response.json();

        if (data.success) {
            const qtyInput = document.querySelector(`.qty-input[data-product="${productId}"][data-variant="${variantId}"]`);
            if (qtyInput) qtyInput.value = data.quantity;

            // Update the item total and cart subtotal
            const itemTotalElement = document.getElementById(`total-${productId}-${variantId}`);
            if (itemTotalElement) itemTotalElement.textContent = `₹${data.itemTotal}`;
            
            const subtotalElement = document.getElementById('cart-subtotal');
            if (subtotalElement) subtotalElement.textContent = `₹${data.subtotal}`;

            // Show feedback message if quantity was capped
            if (data.message && data.message.includes('adjusted')) {
                Swal.fire({ icon: 'info', title: 'Quantity Adjusted', text: data.message, toast: true, position: 'top-end', timer: 3000 });
            }

            
        } else {
            Swal.fire({ icon: 'error', title: 'Update Failed', text: data.message });
        }
    } catch (error) {
        console.error('Update error:', error);
    }
}

async function removeFromCart(productId, variantId) {
    const result = await Swal.fire({
        title: 'Remove Item?',
        text: "Are you sure you want to remove this fragrance?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, remove it!'
    });

    if (result.isConfirmed) {
        try {
            const response = await fetch('/cart/remove', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ productId, variantId })
            });
            const data = await response.json();
            if (data.success) {
                window.location.reload(); // Simplest way to refresh totals and empty states
            }
        } catch (error) {
            console.error('Remove error:', error);
        }
    }
}
