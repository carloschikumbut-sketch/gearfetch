/**
 * script.js - THE MASTER SCRIPT (CLEAN VERSION)
 * Handles: Product Grids, Search, Sliders, and Notifications.
 * Note: Mobile Drawer logic is now handled exclusively by main.js to prevent conflicts.
 */

// --- 2. GLOBAL INITIALIZER ---
document.addEventListener('DOMContentLoaded', () => {
    updateCartCounters();
    updateWishlistCounters();

    // Initialize Product Grids safely to avoid fatal console crashes
    if (typeof initLatestArrivals === "function") {
        initLatestArrivals();
    }
    
    if (typeof initCuratedSection === "function") {
        initCuratedSection();
    }
    
    // Initialize UI Components
    initHeroSlider();
    startReviewSlider();
    initReviewsPagination();
    setupScrollTopBtn();

    if (document.getElementById("announcement-text")) {
        setInterval(rotateMessages, 5000);
    }

    // Initialize Global Search Overlay
    initSearchEngine();
});

function renderToGrid(container, products, showViewAll = false) {
    if (!container) return;
    
    // Safety check: extract array if passed a response wrap object
    let itemsArray = Array.isArray(products) ? products : (products && products.data ? products.data : []);
    if (!Array.isArray(itemsArray)) itemsArray = [];

    let html = itemsArray.map(p => createProductCard(p)).join('');
    if (showViewAll) {
        html += `
            <div class="min-w-[200px] flex items-center justify-center px-8">
                <a href="catalog.html" class="group flex flex-col items-center gap-4">
                    <div class="w-16 h-16 rounded-full border-2 border-dashed border-zinc-200 flex items-center justify-center group-hover:border-red-600 group-hover:bg-red-50 transition-all">
                        <i class="fa-solid fa-arrow-right text-zinc-300 group-hover:text-red-600"></i>
                    </div>
                    <span class="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-black">View All Drops</span>
                </a>
            </div>`;
    }
    container.innerHTML = html;
}

function createProductCard(product) {
    // 1. Data Sanitization
    const price = Number(product.price || 0);
    const oldPrice = Number(product.old_price || 0); // Maps compare price metric smoothly
    const hasDiscount = oldPrice > price;
    const discountPercent = hasDiscount ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;
    const imgUrl = product.image_url || 'assets/placeholder.png';

    return `
    <div class="product-card group relative flex flex-col animate-fade-in bg-white p-2 rounded-[32px] transition-all duration-500 hover:shadow-2xl hover:shadow-zinc-200/50 min-w-[280px] lg:min-w-0">
        <div class="relative aspect-square bg-zinc-100 rounded-[28px] overflow-hidden flex items-center justify-center p-6">
            
            <div class="absolute top-3 left-3 z-20">
                <span class="bg-white px-3 py-1.5 rounded-full shadow-sm text-[9px] font-black uppercase tracking-tighter">
                    ${hasDiscount ? `<span class="text-red-600">${discountPercent}% OFF</span>` : 'New Arrival'}
                </span>
            </div>

            <img src="${imgUrl}" 
                 alt="${product.name}" 
                 onclick="window.location.href='product-details.html?id=${product.id}'"
                 class="w-[85%] object-contain mix-blend-multiply transition-transform duration-700 group-hover:scale-110 cursor-pointer">

            <div class="absolute inset-x-0 bottom-0 p-4 translate-y-0 lg:translate-y-full lg:group-hover:translate-y-0 transition-transform duration-300 z-10">
                <button onclick="window.location.href='product-details.html?id=${product.id}'" 
                        class="w-full bg-black text-white font-black py-3 rounded-xl uppercase italic text-[10px] tracking-widest shadow-2xl hover:bg-red-600 transition-all">
                    View Details
                </button>
            </div>
        </div>

        <div class="p-3 flex flex-col flex-grow">
            <p class="text-red-600 text-[9px] font-black uppercase tracking-[0.15em] mb-1">${product.brand || ''}</p>
            <h3 class="text-black font-bold text-sm leading-tight mt-1 uppercase truncate">${product.name}</h3>
            
            <div class="flex items-end justify-between mt-auto pt-2">
                <div class="flex flex-col">
                    <span class="text-black font-black text-lg leading-none">$${price.toFixed(2)}</span>
                    ${hasDiscount ? `<span class="text-zinc-400 text-[10px] font-bold line-through mt-1">$${oldPrice.toFixed(2)}</span>` : ''}
                </div>
            </div>
        </div>
    </div>`;
}

// --- 4. CART & WISHLIST ---
const GLOBAL_CART_KEY = 'sneaker-lab-cart';

function updateCartCounters() {
    const cart = JSON.parse(localStorage.getItem(GLOBAL_CART_KEY)) || [];
    const count = cart.reduce((acc, item) => acc + (item.quantity || 1), 0);
    document.querySelectorAll('.cart-count').forEach(c => c.innerText = count);
}

// --- 5. SEARCH ENGINE ---
function initSearchEngine() {
    const searchOverlay = document.getElementById('search-overlay');
    const searchOpenIcons = document.querySelectorAll('.icon-search');
    const searchClose = document.getElementById('search-close');
    const searchInput = document.getElementById('search-input');
    const resultsDropdown = document.getElementById('search-results');

    searchOpenIcons.forEach(icon => {
        icon.addEventListener('click', (e) => {
            e.preventDefault();
            searchOverlay?.classList.add('active');
            setTimeout(() => searchInput?.focus(), 400); 
        });
    });

    searchClose?.addEventListener('click', () => {
        searchOverlay?.classList.remove('active');
        resultsDropdown?.classList.remove('active');
    });

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            if (searchTerm.length < 2) {
                resultsDropdown?.classList.remove('active');
                return;
            }
            
            const database = typeof allProducts !== 'undefined' ? allProducts : [];
            const filtered = database.filter(p => p.name.toLowerCase().includes(searchTerm));
            if (filtered.length > 0) {
                resultsDropdown.innerHTML = filtered.map(p => `
                    <a href="product-details.html?id=${p.id}" class="result-item">
                        <img src="${p.image_url}" alt="${p.name}" style="width:40px; height:40px; object-fit:contain;">
                        <div class="result-info">
                            <span class="result-brand" style="display:block; font-size:10px; color:red;">${p.brand || ''}</span>
                            <span class="result-name" style="display:block; font-weight:bold;">${p.name}</span>
                            <span class="result-price">$${Number(p.price).toFixed(2)}</span>
                        </div>
                    </a>`).join('');
                resultsDropdown.classList.add('active');
            } else {
                resultsDropdown.innerHTML = '<div class="p-4 text-center text-xs">No sneakers found.</div>';
                resultsDropdown.classList.add('active');
            }
        });
    }
}

function updateWishlistCounters() {
    const wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
    document.querySelectorAll('.wishlist-count').forEach(c => c.innerText = wishlist.length);
}

// --- 6. UI HELPERS ---
function initHeroSlider() {
    const track = document.getElementById('hero-slider-track');
    if (!track) return;
    const database = typeof allProducts !== 'undefined' ? allProducts : [];
    const products = database.slice(0, 6);
    track.innerHTML = products.map(product => `
        <div class="hero-slide-card">
            <img src="${product.image_url}" alt="${product.name}">
            <div class="card-overlay">
                <h4>${product.name}</h4>
                <p>$${Number(product.price).toFixed(2)}</p>
            </div>
        </div>`).join('');
}

function startReviewSlider() {
    const container = document.getElementById('reviews-container');
    const dotsContainer = document.getElementById('reviews-dots');
    if (!container || !dotsContainer) return;
    const cards = container.querySelectorAll('.review-card');
    dotsContainer.innerHTML = '';
    cards.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.className = `review-dot ${index === 0 ? 'active' : ''}`;
        dot.onclick = () => {
            const width = cards[0].offsetWidth + 24;
            container.scrollTo({ left: width * index, behavior: 'smooth' });
        };
        dotsContainer.appendChild(dot);
    });
}

function initReviewsPagination() {
    const container = document.getElementById('reviews-container');
    const pagination = document.getElementById('reviews-pagination');
    if (!container || !pagination) return;
    const cards = container.querySelectorAll('.bg-white, .review-card');
    if (cards.length <= 1) return;
    pagination.innerHTML = '';
    for (let i = 0; i < cards.length; i++) {
        const dot = document.createElement('div');
        dot.className = `w-2 h-2 rounded-full cursor-pointer transition-all duration-300 ${i === 0 ? 'bg-black w-3 h-3' : 'bg-zinc-300'}`;
        dot.onclick = () => {
            const width = cards[0].offsetWidth + 24;
            container.scrollTo({ left: width * i, behavior: 'smooth' });
        };
        pagination.appendChild(dot);
    }
}

const messages = ["WINTER SALE - 50% OFF!", "FREE SHIPPING OVER $150!", "JOIN THE CREW"];
let currentIndex = 0;
function rotateMessages() {
    const el = document.getElementById("announcement-text");
    if (!el) return;
    el.style.opacity = 0;
    setTimeout(() => {
        currentIndex = (currentIndex + 1) % messages.length;
        el.textContent = messages[currentIndex];
        el.style.opacity = 1;
    }, 500);
}

function setupScrollTopBtn() {
    let btn = document.getElementById('scroll-top-btn');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'scroll-top-btn';
        btn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
        document.body.appendChild(btn);
    }
    window.addEventListener('scroll', () => {
        if (window.scrollY > 500) btn.classList.add('show');
        else btn.classList.remove('show');
    });
    btn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => { 
        toast.style.opacity = '0'; 
        setTimeout(() => toast.remove(), 500); 
    }, 3000);
}

const _supabase = window._supabase;

// Helper to render products to a specific ID safely across all pages
function renderProductsToID(products, elementId) {
    const grid = document.getElementById(elementId);
    if (!grid) return;
    
    // Unpack if products parameter is wrapped inside a data object
    let itemsArray = Array.isArray(products) ? products : (products && products.data ? products.data : []);
    if (!Array.isArray(itemsArray)) itemsArray = [];
    
    // Clear the grid and map your createProductCard function
    grid.innerHTML = itemsArray.map(p => createProductCard({
        ...p,
        old_price: p.compare_at_price || 0 
    })).join('');
    
    // If you have a 'View All' card logic, call it here
    if (typeof appendViewAllCard === 'function') {
        appendViewAllCard(elementId);
    }
}

async function initSupabaseStorefront() {
    if (!_supabase) return;
    try {
        // Fetch ALL products from Supabase once if not handled by catalog.js
        const { data: rawProducts, error } = await _supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        if (!rawProducts) return;

        // Sync to global array shared across namespaces if needed
        allProducts = rawProducts.map(p => ({
            ...p,
            old_price: p.compare_at_price || 0,
            image_url: p.image_url || 'images/placeholder.jpg'
        }));

        // 2. Feed "Latest Drops" (The first 8 items)
        renderProductsToID(allProducts.slice(0, 8), 'latest-drops');
        renderProductsToID(allProducts.slice(0, 8), 'latest-arrivals-grid');

        // 3. Feed "Curated Grid" (Shuffled items)
        const shuffled = [...allProducts].sort(() => 0.5 - Math.random()).slice(0, 8);
        const curatedContainer = document.getElementById('curated-grid');
        if (curatedContainer) {
            renderToGrid(curatedContainer, shuffled, true);
        }

    } catch (err) {
        console.error("Storefront Load Error:", err.message);
    }
}

// Start the live sync
document.addEventListener('DOMContentLoaded', initSupabaseStorefront);