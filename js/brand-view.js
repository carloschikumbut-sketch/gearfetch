/**
 * brand-view.js
 * Handles dynamic filtering based on URL parameters
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Get the brand from the URL (e.g., ?brand=NIKE)
    const urlParams = new URLSearchParams(window.location.search);
    const brandName = urlParams.get('brand');

    if (!brandName) {
        window.location.href = 'index.html'; // Redirect if no brand found
        return;
    }

    // 2. Update the UI Title
    document.getElementById('brand-title').innerText = `${brandName.toUpperCase()} COLLECTION`;
    document.title = `SNEAKERLAB | ${brandName.toUpperCase()}`;

    // 3. Fetch from Supabase
    await fetchBrandProducts(brandName.toUpperCase());
});

async function fetchBrandProducts(brand) {
    const grid = document.getElementById('brand-grid');
    const countText = document.getElementById('brand-count');

    try {
        const { data: products, error } = await _supabase
            .from('products')
            .select('*')
            .eq('brand', brand) // FILTER: Match the brand column exactly
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Update count
        countText.innerText = `${products.length} pairs found`;

        // Reuse the master render function from script.js
        if (products.length > 0) {
            renderBrandGrid(products, 'brand-grid');
        } else {
            grid.innerHTML = `<p class="no-results">No ${brand} sneakers in stock yet.</p>`;
        }

    } catch (err) {
        console.error("Brand fetch error:", err.message);
        grid.innerHTML = "<p>Error loading collection.</p>";
    }
}

// Custom render for Brand Page (No "View All" card at the end)
function renderBrandGrid(products, gridId) {
    const grid = document.getElementById(gridId);
    const wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];

    grid.innerHTML = products.map(product => {
        const isWishlisted = wishlist.some(item => item.id === product.id);
        const productJSON = JSON.stringify(product).replace(/"/g, '&quot;');
        
        return `
        <div class="product-card">
            <div class="product-image-container">
                <button class="wishlist-btn ${isWishlisted ? 'active' : ''}" onclick="toggleWishlist(this, ${productJSON})">
                    <i class="${isWishlisted ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                </button>
                <img src="${product.image_url}" alt="${product.name}" class="product-img" onclick="window.location.href='product-details.html?id=${product.id}'">
            </div>
            <div class="product-details">
                <span class="brand-tag">${product.brand}</span>
                <h3 class="product-name">${product.name}</h3>
                <p class="product-price">$${parseFloat(product.price).toFixed(2)}</p>
                <div class="product-buttons">
                    <button class="add-to-cart-btn" onclick='addToCart(${productJSON})'>Add</button>
                    <button class="buy-now-btn" onclick='buyNow(${productJSON})'>Buy</button>
                </div>
            </div>
        </div>
    `}).join('');
}