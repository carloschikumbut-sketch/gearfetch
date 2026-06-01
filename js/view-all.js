/**
 * js/view-all.js 
 * Detects the category based on the HTML filename and fetches data.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Identify which page the user is on
    const path = window.location.pathname;
    const page = path.split("/").pop();
    
    let targetCategory = "";
    let pageTitle = "";

    // 2. Mapping: If the filename is X, look for Category Y in Supabase
    const categoryMap = {
        'latest-arrivals.html': { cat: 'latest', title: 'Latest Arrivals' },
        'trending.html': { cat: 'trending', title: 'Curated For You' },
        'sneakers.html': { cat: 'sneakers', title: 'All Sneakers' },
        'slides.html': { cat: 'slides', title: 'Slides & Sandals' }
    };

    if (categoryMap[page]) {
        targetCategory = categoryMap[page].cat;
        pageTitle = categoryMap[page].title;
    }

    // 3. Update the UI Heading
    const titleElement = document.querySelector('.section-title');
    if (titleElement) titleElement.innerText = pageTitle;

    // 4. Fetch the data if we found a match
    if (targetCategory) {
        fetchCategoryData(targetCategory);
    }
});

async function fetchCategoryData(category) {
    const grid = document.getElementById('full-product-grid');
    if (!grid) return;

    // Fetch from Supabase where category column matches our target
    const { data: products, error } = await _supabase
        .from('products')
        .select('*')
        .eq('category', category)
        .order('created_at', { ascending: false });

    if (error) {
        grid.innerHTML = `<p>Error loading items: ${error.message}</p>`;
        return;
    }

    if (products.length === 0) {
        grid.innerHTML = `<p class="no-results">No products found in ${category} yet.</p>`;
        return;
    }

    // Render the cards
    grid.innerHTML = products.map(product => `
        <div class="product-card">
            <div class="product-image-container">
                <img src="${product.image_url}" class="product-img" onclick="window.location.href='product-details.html?id=${product.id}'">
            </div>
            <div class="product-details">
                <span class="brand-tag">${product.brand || 'PREMIUM'}</span>
                <h3 class="product-name">${product.name}</h3>
                <p class="product-price">$${parseFloat(product.price).toFixed(2)}</p>
                <button class="add-to-cart-btn" onclick='addToCart(${JSON.stringify(product).replace(/"/g, '&quot;')})'>Add to Cart</button>
            </div>
        </div>
    `).join('');
}