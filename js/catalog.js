/**
 * CATALOG.JS - Optimized Vault Brain
 * Handles: Supabase Fetching, Search, Filtering, and Pagination
 * Fixed: category filtering now handles both array and string values from Supabase
 */

// Global State
let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 16;

const client = window._supabase || (typeof supabase !== 'undefined' ? supabase : null);

/**
 * HELPER: Safely check if a product matches the category filter.
 * Handles all 3 formats Supabase may return:
 * - Array:   ["sneakers", "jordan"]
 * - String: "sneakers"
 * - null / undefined
 */
function matchesCategory(product, categoryFilter) {
    if (!categoryFilter) return true; // No filter = show everything

    const cat = product.category;

    if (!cat) return false;

    // Array format (Supabase _text / text[] column)
    if (Array.isArray(cat)) {
        return cat.some(c => c.toLowerCase() === categoryFilter);
    }

    // Plain string format
    if (typeof cat === 'string') {
        return cat.toLowerCase() === categoryFilter;
    }

    return false;
}

/**
 * 1. INITIALIZATION
 */
async function init() {
    if (!client) {
        console.error("Vault Error: Supabase not initialized.");
        return;
    }

    await fetchAllData();

    const isCatalogPage = !!document.getElementById('catalog-grid');
    const isHomePage    = !!document.getElementById('latest-drops');

    if (isCatalogPage) {
        setupListeners();
        renderCatalog();
        updateResultCount(); // Show count after render
    }

    if (isHomePage) {
        initHomeSections();
    }
}

/**
 * 2. DATA FETCHING & MULTI-FILTER LOGIC
 */
async function fetchAllData() {
    try {
        const { data, error } = await client
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // 1. Grab global filters (Brand or Category)
        const brandTarget = window.CATALOG_BRAND ? String(window.CATALOG_BRAND).toLowerCase() : null;
        const categoryTarget = window.CATALOG_CATEGORY ? String(window.CATALOG_CATEGORY).toLowerCase() : null;

        console.log(`[Catalog] DB Load Complete. Applying filters: Brand="${brandTarget}", Category="${categoryTarget}"`);

        allProducts = (data || [])
            .map(p => ({
                ...p,
                // Standardize price and images from schema
                old_price: p.compare_at_price || 0,
                image_url: p.image_url || 'images/placeholder.jpg'
            }))
            .filter(p => {
                // --- Brand Logic ---
                // If a brand target exists (e.g. "Nike"), check if product brand matches
                const pBrand = p.brand ? String(p.brand).toLowerCase() : "";
                const matchesBrand = brandTarget ? (pBrand === brandTarget) : true;

                // --- Category Logic ---
                // If a category target exists (e.g. "slides"), check if product category matches
                // Use the custom matchesCategory helper function for clean evaluation
                const matchesCat = categoryTarget ? matchesCategory(p, categoryTarget) : true;

                // Product must satisfy BOTH brand and category if both are provided
                return matchesBrand && matchesCat;
            });

        console.log(`[Catalog] Filtering complete. Showing ${allProducts.length} items.`);

        // Update working array for the search/sort functions
        filteredProducts = [...allProducts];

        // Trigger the initial render by passing the actual data list
        const isCatalogPage = !!document.getElementById('catalog-grid');
        if (isCatalogPage && typeof renderCatalog === 'function') {
            renderCatalog(); 
        }

    } catch (err) {
        console.error("Database Load Error:", err.message);
        const grid = document.getElementById('catalog-grid');
        if (grid) {
            grid.innerHTML = `
                <div class="col-span-full py-20 text-center text-red-500 font-bold uppercase text-[10px]">
                    Failed to load products: ${err.message}
                </div>`;
        }
    }
}

/**
 * 3. CORE RENDERING ENGINE
 */
function renderProducts(products, containerId = 'catalog-grid') {
    const grid = document.getElementById(containerId);
    if (!grid) return;

    // Unpack if products parameter is an object with an array nested inside it
    let itemsArray = Array.isArray(products) ? products : (products && products.data ? products.data : []);

    if (!itemsArray || itemsArray.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full py-20 text-center font-black uppercase text-zinc-400 tracking-widest text-[10px]">
                No items found in the vault.
            </div>`;
        return;
    }
grid.innerHTML = itemsArray.map(product => createProductCard({
        ...product,
        old_price: product.compare_at_price || 0
    })).join('');
}
  

/**
 * 4. CATALOG LOGIC (Search, Filter, Pagination)
 */
function renderCatalog() {
    const start         = (currentPage - 1) * ITEMS_PER_PAGE;
    const end           = start + ITEMS_PER_PAGE;
    const paginatedItems = filteredProducts.slice(start, end);

    renderProducts(paginatedItems, 'catalog-grid');
    renderPaginationUI();
    updateResultCount();
}

function updateResultCount() {
    const el = document.getElementById('result-count');
    if (!el) return;
    const total = filteredProducts.length;
    el.textContent = total === 0
        ? 'No products found'
        : `${total} product${total !== 1 ? 's' : ''} found`;
}

function renderPaginationUI() {
    const container = document.getElementById('pagination-container')
                   || document.querySelector('.pagination-container');
    if (!container) return;

    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    let html = `
        <button onclick="changePage(${currentPage - 1})"
            class="w-12 h-12 flex items-center justify-center bg-white border border-zinc-100 rounded-xl transition-all ${currentPage === 1 ? 'opacity-20 pointer-events-none' : 'hover:bg-zinc-50'}">
            <i class="fa-solid fa-chevron-left text-[10px]"></i>
        </button>`;

    for (let i = 1; i <= totalPages; i++) {
        const isActive = i === currentPage;
        html += `
            <button onclick="changePage(${i})"
                class="w-12 h-12 flex items-center justify-center font-black text-xs rounded-xl transition-all ${isActive ? 'bg-black text-white shadow-lg' : 'bg-white text-zinc-400 border border-zinc-100 hover:text-black hover:border-black'}">
                ${i}
            </button>`;
    }

    html += `
        <button onclick="changePage(${currentPage + 1})"
            class="w-12 h-12 flex items-center justify-center bg-white border border-zinc-100 rounded-xl transition-all ${currentPage === totalPages ? 'opacity-20 pointer-events-none' : 'hover:bg-zinc-50'}">
            <i class="fa-solid fa-chevron-right text-[10px]"></i>
        </button>`;

    container.innerHTML = html;
}

window.changePage = (page) => {
    currentPage = page;
    renderCatalog();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

function setupListeners() {
    const searchInput     = document.getElementById('catalog-search');
    const priceRange      = document.getElementById('price-range');
    const priceDisplay    = document.getElementById('price-display');
    const brandCheckboxes = document.querySelectorAll('.filter-checkbox');

    const applyFilters = () => {
        const query         = searchInput?.value.toLowerCase() || "";
        const maxPrice      = priceRange ? parseInt(priceRange.value) : 9999;
        const selectedBrands = Array.from(brandCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value.toUpperCase());

        // Show / hide the "Active Filters" clear button
        const activeFiltersEl = document.getElementById('active-filters');
        if (activeFiltersEl) {
            const hasFilters = selectedBrands.length > 0 || (priceRange && parseInt(priceRange.value) < 1000) || query;
            activeFiltersEl.classList.toggle('hidden', !hasFilters);
        }

        filteredProducts = allProducts.filter(p => {
            const matchesSearch  = !query || p.name.toLowerCase().includes(query) || (p.brand || '').toLowerCase().includes(query);
            const matchesPrice   = Number(p.price) <= maxPrice;
            const matchesBrand   = selectedBrands.length === 0 || selectedBrands.includes((p.brand || '').toUpperCase());
            return matchesSearch && matchesPrice && matchesBrand;
        });

        currentPage = 1;
        renderCatalog();
    };

    if (searchInput)  searchInput.addEventListener('input', applyFilters);

    if (priceRange) {
        priceRange.addEventListener('input', (e) => {
            if (priceDisplay) priceDisplay.textContent = `$${e.target.value}`;
            applyFilters();
        });
    }

    brandCheckboxes.forEach(cb => cb.addEventListener('change', applyFilters));
}

/**
 * 5. HOME PAGE SECTIONS
 */
function initHomeSections() {
    const latest  = allProducts.slice(0, 8);
    renderProducts(latest, 'latest-drops');

    const curated = [...allProducts].sort(() => 0.5 - Math.random()).slice(0, 8);
    renderProducts(curated, 'curated-grid');
}

// Ignition
document.addEventListener('DOMContentLoaded', init);