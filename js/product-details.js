/**
 * SNEAKER LAB - PRODUCT ENGINE 2026
 * Finalized Product Details Logic
 */

async function loadProductDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        window.location.href = 'index.html';
        return;
    }

    if (!window._supabase) {
        setTimeout(loadProductDetails, 100);
        return;
    }

    try {
        const { data: product, error } = await window._supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();

        if (error) throw error;
        if (!product) throw new Error("Product missing from database");

        window.currentProduct = product;
        
        // --- NEW: Sync Meta Tags with the fetched Product ---
        updatePageMetadata(product); 
        // ----------------------------------------------------
        
        renderProductToUI(product);
        setupSizeDropdown(product);
        initializeUnlimitedGallery(product);
        fetchColorSwatches(product);
        initializeAddToBag();

        // ✅ TRIGGER THE LISTENERS
        initializeModalListeners(product); 

        // --- ADD THIS ONE LINE HERE ---
        loadRecommendations(product); 
        // ------------------------------

    } catch (err) {
        console.error("Database Fetch Error:", err.message);
        // ... (Error UI logic)
    }
}

// Keep this definition OUTSIDE and BELOW the load function
function initializeModalListeners(product) {
    const sizeMissingBtn = document.getElementById('size-missing-btn');
    if (sizeMissingBtn) {
        sizeMissingBtn.onclick = () => openNotifyModal(product);
    }

    const submitBtn = document.getElementById('modal-email-btn');
    if (submitBtn) {
        submitBtn.onclick = () => handleRestockRequest(product.id);
    }
}

function renderProductToUI(product) {
    document.getElementById('product-brand').textContent = product.brand;
    document.getElementById('product-name').textContent = product.name;
    document.getElementById('product-desc').textContent = product.description || "No description provided.";
    
    // Price Logic
    const priceEl = document.getElementById('product-price');
    const oldPriceEl = document.getElementById('product-old-price');
    
    priceEl.textContent = `$${Number(product.price).toFixed(2)}`;
    if (product.compare_at_price) {
        oldPriceEl.textContent = `$${Number(product.compare_at_price).toFixed(2)}`;
        oldPriceEl.classList.remove('hidden');
    } else {
        oldPriceEl.classList.add('hidden');
    }

    // Specifications Logic
    const specStyle = document.getElementById('spec-style');
    const specColor = document.getElementById('spec-color');
    if (specStyle) specStyle.textContent = product.style_code || "N/A";
    if (specColor) specColor.textContent = product.colorway || "Original";
}

function getEquivalents(ukSize) {
    const size = parseFloat(ukSize);
    return {
        uk: size.toString(),
        us: (size + 1).toString(), // UK size + 1 = US Men's
        eu: (size + 33.5).toString() // Standard conversion
    };
}



function changeSizeUnit(unit, e) {
    if (e) e.stopPropagation(); // Stops the event from hitting the document click listener
    window.currentUnit = unit;
    
    document.querySelectorAll('.size-pill').forEach(pill => {
        pill.classList.toggle('active', pill.innerText.toLowerCase() === unit.toLowerCase());
    });
    
    setupSizeDropdown(window.currentProduct); 
    // Do NOT add menu.classList.add('hidden') here. It will stay open.
}

function setupSizeDropdown(product) {
    const list = document.getElementById('size-options-list');
    const displaySpan = document.querySelector('#selected-size-display span');
    const menu = document.getElementById('size-dropdown-menu');
    const container = document.querySelector('.size-selector-container');
    
    // Check if the product has variants
    if (!list || !product.variants || product.variants.length === 0) {
        if (container) container.classList.add('hidden');
        return;
    }
    
    // Define isFootwear here
    const cat = Array.isArray(product.category) ? product.category : [product.category || ''];
    const isFootwear = cat.some(c => ['sneakers', 'slides'].includes(c.toLowerCase()));
    
    // Handle Unit Tabs visibility
    const unitTabs = document.querySelector('.unit-tabs-container');
    if (unitTabs) {
        unitTabs.style.display = isFootwear ? 'flex' : 'none';
    }

    if (container) container.classList.remove('hidden');

    list.innerHTML = '';
    product.variants.forEach(v => {
        const hasStock = parseInt(v.stock || 0) > 0;
        const eq = isFootwear ? getEquivalents(v.size) : { uk: v.size, us: v.size, eu: v.size };
        const displayValue = eq[window.currentUnit] || v.size;
        
        const btn = document.createElement('button');
        btn.className = `w-full text-left px-4 py-3 text-sm font-bold border-b border-gray-50 flex justify-between items-center ${hasStock ? 'hover:bg-gray-50' : 'bg-gray-50/50 text-gray-400'}`;
        
        btn.innerHTML = `
            <span>${displayValue}</span>
            <span class="text-[10px] uppercase font-medium">${hasStock ? `${v.stock} Available` : 'Sold Out'}</span>
        `;
        
        btn.onclick = (e) => {
            e.stopPropagation();
            if (hasStock) {
                window.selectedSize = v.size;
                displaySpan.textContent = displayValue;
                menu.classList.add('hidden'); 
            } else {
                openNotifyModal(product, `UK ${v.size}`);
                menu.classList.add('hidden'); 
            }
        };
        list.appendChild(btn);
    });
}

// Find this function in js/product-details.js
function initializeUnlimitedGallery(product) {
    const gallery = document.getElementById('main-gallery');
    const thumbContainer = document.getElementById('thumb-container');
    
    if (!gallery) return;

    // --- FIX: Use a Set to automatically remove duplicate image URLs ---
    const rawImages = [product.image_url, ...(product.image_gallery || [])].filter(Boolean);
    const images = [...new Set(rawImages)]; 
    // -------------------------------------------------------------------
    
    gallery.innerHTML = ''; 
    thumbContainer.innerHTML = ''; 
    
    images.forEach((url, index) => {
        // Main Image Slide
        const slide = document.createElement('div');
        slide.innerHTML = `<img src="${url}">`;
        gallery.appendChild(slide);

        // Thumbnail
        const thumb = document.createElement('button');
        thumb.className = `thumb-btn ${index === 0 ? 'active' : ''}`;
        thumb.innerHTML = `<img src="${url}">`;
        
        thumb.onclick = () => {
            gallery.scrollTo({ left: gallery.offsetWidth * index, behavior: 'smooth' });
            document.querySelectorAll('.thumb-btn').forEach(b => b.classList.remove('active'));
            thumb.classList.add('active');
        };
        thumbContainer.appendChild(thumb);
    });

    // Auto-update thumbnail when gallery is swiped
    gallery.onscroll = () => {
        const index = Math.round(gallery.scrollLeft / gallery.offsetWidth);
        const thumbs = document.querySelectorAll('.thumb-btn');
        if(thumbs[index] && !thumbs[index].classList.contains('active')) {
            thumbs.forEach(b => b.classList.remove('active'));
            thumbs[index].classList.add('active');
        }
    };
}

async function fetchColorSwatches(product) {
    const swatchContainer = document.getElementById('swatch-container');
    const colorLabel = document.getElementById('color-label');
    if (!swatchContainer) return;

    if (colorLabel) colorLabel.textContent = product.colorway || "Default";

    // Fuzzy matching for related colors (Same brand + Similar Name)
    const baseModelName = product.name.split(/["']/)[0].trim(); 

    const { data: related, error } = await window._supabase
        .from('products')
        .select('id, image_url, colorway')
        .eq('brand', product.brand)
        .ilike('name', `%${baseModelName}%`)
        .neq('id', product.id)
        .limit(6);

    if (error) return;

    let html = `
        <div class="w-12 h-12 border-2 border-black rounded-lg overflow-hidden p-0.5 shadow-sm">
            <img src="${product.image_url}" class="w-full h-full object-cover rounded-md">
        </div>
    `;

    if (related) {
        related.forEach(item => {
            html += `
                <a href="product-details.html?id=${item.id}" 
                   class="w-12 h-12 border border-gray-200 rounded-lg overflow-hidden p-0.5 hover:border-black transition-all opacity-70 hover:opacity-100"
                   title="${item.colorway}">
                    <img src="${item.image_url}" class="w-full h-full object-cover rounded-md">
                </a>`;
        });
    }
    swatchContainer.innerHTML = html;
}

function initializeAddToBag() {
    const addBtn = document.getElementById('add-to-bag-btn');
    if (!addBtn) return;

    addBtn.onclick = () => {
        const product = window.currentProduct;
        const selectedSize = window.selectedSize;

        if (!selectedSize) {
            alert("Please select a size first.");
            document.getElementById('size-dropdown-menu')?.classList.remove('hidden');
            return;
        }

        const variant = product.variants.find(v => v.size === selectedSize);
        const stock = parseInt(variant?.stock || 0);

        const cartItem = {
            id: product.id,
            name: product.name,
            price: parseFloat(product.price),
            image: product.image_url,
            size: selectedSize,
            quantity: 1,
            maxStock: stock 
        };

        addToCart(cartItem);
    };
}

function addToCart(newItem) {
    let cartData = JSON.parse(localStorage.getItem(CART_KEY)) || [];
    const existingIndex = cartData.findIndex(item => item.id === newItem.id && item.size === newItem.size);

    if (existingIndex > -1) {
        if (cartData[existingIndex].quantity < newItem.maxStock) {
            cartData[existingIndex].quantity += 1;
        } else {
            alert("Maximum available stock reached.");
            return;
        }
    } else {
        cartData.push(newItem);
    }

    localStorage.setItem(CART_KEY, JSON.stringify(cartData));

    // UI Updates
    if (typeof updateCartBadge === "function") updateCartBadge();
    showSuccessFeedback();
    if (typeof openCart === "function") openCart();
}

function showSuccessFeedback() {
    const btn = document.getElementById('add-to-bag-btn');
    if (!btn) return;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'ADDED ✓';
    btn.classList.replace('bg-black', 'bg-green-600');
    setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = originalText;
        btn.classList.replace('bg-green-600', 'bg-black');
    }, 2000);
}

// Global Event Listeners

document.addEventListener('DOMContentLoaded', () => {
    loadProductDetails();

    document.addEventListener('click', (e) => {
        const menu = document.getElementById('size-dropdown-menu');
        const display = document.getElementById('selected-size-display');
        
        // Toggle if clicking the display
        if (display && display.contains(e.target)) {
            menu.classList.toggle('hidden');
            return;
        }

        // Do NOT close if clicking inside the menu (pills or list)
        if (menu && menu.contains(e.target)) {
            return;
        }

        // Otherwise close
        menu.classList.add('hidden');
    });
});

// Function to open the notification modal
function openNotifyModal(product, prefillSize = '') {
    const modal = document.getElementById('notify-modal');
    const modalImg = document.getElementById('modal-product-img');
    const sizeInput = document.getElementById('modal-size-input');
    
    if (modal && product) {
        modal.classList.remove('hidden');
        modalImg.src = product.image_url;
        sizeInput.value = prefillSize; // If they clicked a 'Sold Out' size specifically
    }
}

// Function to close the modal
function closeNotifyModal() {
    document.getElementById('notify-modal').classList.add('hidden');
}

// Submission Logic
async function handleRestockRequest(productId) {
    const email = document.getElementById('notify-email-input').value;
    const size = document.getElementById('modal-size-input').value;
    const btn = document.getElementById('modal-email-btn');

    if (!email || !size) {
        alert("Please provide both an email and the size you need.");
        return;
    }

    btn.innerText = "SENDING...";
    btn.disabled = true;

    try {
        const { error } = await _supabase
            .from('restock_requests')
            .insert([{ 
                product_id: productId, 
                email: email, 
                requested_size: size,
                status: 'pending' 
            }]);

        if (error) throw error;

        alert("Request received! We'll notify you soon.");
        closeNotifyModal();
    } catch (err) {
        console.error("Error submitting request:", err);
        alert("Something went wrong. Please try again.");
    } finally {
        btn.innerText = "SUBMIT REQUEST";
        btn.disabled = false;
    }
}


/**
 * Updates the page's metadata and SEO tags based on the selected product.
 * @param {Object} product - The product object (name, price, image, description).
 */
function updatePageMetadata(product) {
    if (!product) return;

    // 1. Update Document Title (Browser Tab)
    document.title = `${product.name} | GEAR FETCH `;

    // 2. Update Description & OG Tags
    const descriptionText = `Buy the ${product.name} at GEAR FETCH. 100% Authentic. Fast nationwide delivery in Zimbabwe. Price: $${product.price}`;
    
    document.getElementById('meta-description').setAttribute('content', descriptionText);
    document.getElementById('og-title').setAttribute('content', product.name);
    document.getElementById('og-description').setAttribute('content', descriptionText);
    document.getElementById('og-image').setAttribute('content', product.image);
    document.getElementById('og-url').setAttribute('content', window.location.href);

    // 3. Update JSON-LD Schema (Google)
    const schemaTag = document.getElementById('product-schema');
    const updatedSchema = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": product.name,
        "image": [product.image],
        "description": descriptionText,
        "brand": {
            "@type": "Brand",
            "name": "GEAR FETCH"
        },
        "offers": {
            "@type": "Offer",
            "url": window.location.href,
            "priceCurrency": "USD",
            "price": product.price,
            "availability": "https://schema.org/InStock"
        }
    };
    schemaTag.textContent = JSON.stringify(updatedSchema);
    
    console.log("Metadata updated for:", product.name);
}

// EXAMPLE USAGE: 
// Inside your existing 'displayProduct' function, just add:
// updatePageMetadata(selectedProduct);

/**
 * ADD THIS NEW FUNCTION TO js/product-details.js
 * This fetches related products and renders them using the global template.
 */

async function loadRecommendations(currentProduct) {
    const grid = document.getElementById('recommended-grid');
    if (!grid) return;

    // 1. Fetch matching brand products first
    let { data: brandProducts, error } = await window._supabase
        .from('products')
        .select('*')
        .eq('brand', currentProduct.brand)
        .neq('id', currentProduct.id) // Exclude current product
        .limit(8);

    let finalProducts = brandProducts || [];

    // 2. Fallback: If we have fewer than 8, fetch general products to fill the gaps
    if (finalProducts.length < 8) {
        const remainingNeeded = 8 - finalProducts.length;
        
        // Build an exclusion list so we don't fetch duplicates
        const excludeIds = finalProducts.map(p => p.id);
        excludeIds.push(currentProduct.id);

        const { data: generalProducts } = await window._supabase
            .from('products')
            .select('*')
            .not('id', 'in', `(${excludeIds.join(',')})`)
            .limit(remainingNeeded);

        if (generalProducts) {
            finalProducts = [...finalProducts, ...generalProducts];
        }
    }

    // 3. Render using the global template
    if (finalProducts.length > 0) {
        grid.innerHTML = finalProducts.map(item => createProductCard(item)).join('');
    } else {
        grid.innerHTML = '<p class="text-xs text-zinc-400 p-4">No recommendations available.</p>';
    }
}