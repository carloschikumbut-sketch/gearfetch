const cartSidebar = document.getElementById('cart-sidebar');
const cartOverlay = document.getElementById('cart-overlay');

// --- 1. OPEN/CLOSE LOGIC ---
function openCart() {
    renderSideCart(); // Refresh the list before showing
    cartSidebar.classList.remove('translate-x-full');
    cartOverlay.classList.remove('hidden');
    document.body.classList.add('cart-open');
    setTimeout(() => cartOverlay.classList.add('opacity-100'), 10);
}

function closeCart() {
    cartSidebar.classList.add('translate-x-full');
    cartOverlay.classList.remove('opacity-100');
    document.body.classList.remove('cart-open');
    setTimeout(() => cartOverlay.classList.add('hidden'), 300);
}

// Event Listeners for closing
document.getElementById('close-cart').onclick = closeCart;
cartOverlay.onclick = closeCart;

// --- 2. RENDER THE CART (UI Reference Match) ---
function renderSideCart() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const container = document.getElementById('side-cart-items');
    let subtotal = 0;

    if (cart.length === 0) {
        container.innerHTML = `<div class="text-center py-20 text-gray-400 uppercase font-bold tracking-widest">Your bag is empty</div>`;
        document.getElementById('side-subtotal').innerText = "$0.00";
        return;
    }

    container.innerHTML = cart.map((item, index) => {
        const price = parseFloat(item.price);
        subtotal += price * item.quantity;

        return `
        <div class="flex gap-4 item-entry">
            <div class="w-24 h-24 bg-gray-50 p-2 shrink-0">
                <img src="${item.image}" class="w-full h-full object-contain">
            </div>
            <div class="flex-1">
                <div class="flex justify-between items-start">
                    <h4 class="font-black uppercase tracking-tighter text-lg leading-none">${item.name}</h4>
                </div>
                <p class="text-[11px] text-gray-500 font-bold uppercase mt-2">
                    Color: <span class="text-black">${item.color || 'Default'}</span><br>
                    Size: <span class="text-black">US ${item.size} / EU ${item.eu_size || ''}</span>
                </p>
                <div class="flex justify-between items-center mt-4">
                    <div class="flex items-center border border-gray-200">
                        <button onclick="updateQty(${index}, -1)" class="px-3 py-1 hover:bg-gray-100">-</button>
                        <span class="px-3 font-bold text-sm">${item.quantity}</span>
                        <button onclick="updateQty(${index}, 1)" class="px-3 py-1 hover:bg-gray-100">+</button>
                    </div>
                    <span class="font-black italic text-lg">$${(price * item.quantity).toFixed(2)}</span>
                </div>
            </div>
        </div>`;
    }).join('');

    document.getElementById('side-subtotal').innerText = `$${subtotal.toFixed(2)}`;
}

// --- 3. CORE ACTIONS ---
window.addToCart = function(product, size) {
    if (!size || size === "Select size") {
        alert("Please select a size first!");
        return;
    }

    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    // Check if item with same ID and Size exists
    const existingIndex = cart.findIndex(i => i.id === product.id && i.size === size);

    if (existingIndex > -1) {
        cart[existingIndex].quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image_url,
            size: size,
            quantity: 1
        });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    openCart(); // The Instant Slide!
};

window.updateQty = (index, change) => {
    let cart = JSON.parse(localStorage.getItem('cart'));
    cart[index].quantity += change;
    if (cart[index].quantity < 1) cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderSideCart();
};