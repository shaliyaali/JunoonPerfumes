  function VarientSelectionModal(productId) {
        if (!window.Junoon.isAuthenticated) {
            Swal.fire({
                title: 'Sign In Required',
                text: "Please sign in to your account to add items to your shopping bag.",
                icon: 'info',
                showCancelButton: true,
                confirmButtonColor: '#d4af37',
                cancelButtonColor: '#1a1a1a',
                confirmButtonText: 'Go to Sign In',
                cancelButtonText: 'Maybe Later'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = `/signin`;
                }
            });
            return;
        }

        const product = window.allProducts.find(p => p._id === productId);
        if (!product) return;

        document.getElementById('modal-product-name').textContent = product.name;
        document.getElementById('modal-product-id').value = productId;
        document.getElementById('modal-qty').value = 1;

        const optionsContainer = document.getElementById('variant-options');
        optionsContainer.innerHTML = product.variants.map((v, index) => {
            const priceDisplay = `<p class="text-[10px] font-bold text-primary">₹${v.salePrice.toLocaleString()}</p>`;
            
            const stockDisplay = v.stock > 0 
                ? `<span class="text-[9px] text-gray-500 block">In Stock (${v.stock})</span>`
                : `<span class="text-[9px] text-red-500 block">Sold Out</span>`;

            return `
            <label class="relative cursor-pointer group">
                <input type="radio" name="variant-choice" value="${v._id}" class="peer hidden" ${index === 0 ? 'checked' : ''} data-stock="${v.stock}">
                <div class="border border-gray-200 p-3 text-center peer-checked:border-primary peer-checked:bg-primary/5 transition-all">
                    <p class="text-[11px] font-bold uppercase tracking-widest text-gray-900">${v.size}</p>
                    ${priceDisplay}
                    ${stockDisplay}
                </div>
            </label>
        `}).join('');

        const modal = document.getElementById('variant-selection-modal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    function closeVariantModal() {
        const modal = document.getElementById('variant-selection-modal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    function updateModalQty(change) {
        const input = document.getElementById('modal-qty');
        let val = parseInt(input.value) + change;
        if (val < 1) val = 1;
        if (val > 5) val = 5;
        input.value = val;
    }
