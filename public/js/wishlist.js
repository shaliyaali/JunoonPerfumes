
async function toggleWishlist(productId, variantId) {
    if (!window.Junoon.isAuthenticated) {
        Swal.fire({
            title: 'Sign In Required',
            text: "Please sign in to your account to add items to your wishlist.",
            icon: 'info',
            showCancelButton: true,
            confirmButtonColor: '#d4af37',
            cancelButtonColor: '#1a1a1a',
            confirmButtonText: 'Go to Sign In'
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.href = '/signin';
            }
        });
        return;
    }

    try {
        const response = await fetch('/wishlist/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, variantId })
        });

        const data = await response.json();
        if (data.success) {
            const wishBadge = document.getElementById('wishlist-count');
            if (wishBadge) {
                wishBadge.textContent = data.wishlistCount;
                wishBadge.classList.toggle('hidden', data.wishlistCount === 0);
            }

            const btns = document.querySelectorAll(`.wishlist-btn-${productId}`);
            btns.forEach(btn => {
                const icon = btn.querySelector('span');
                btn.classList.toggle('text-primary', data.added);
                btn.classList.toggle('text-gray-400', !data.added);
                icon.style.fontVariationSettings = data.added ? "'FILL' 1" : "'FILL' 0";
            });

            Swal.fire({ icon: data.added ? 'success' : 'info', title: data.added ? 'Added to Wishlist' : 'Removed', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        }
    } catch (error) {
        console.error('Wishlist error:', error);
    }
}
