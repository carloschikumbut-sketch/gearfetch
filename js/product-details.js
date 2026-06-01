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

function setupSizeDropdown(product) {
    const list = document.getElementById('size-options-list');
    const displaySpan = document.querySelector('#selected-size-display span');
    const dropdownMenu = document.getElementById('size-dropdown-menu');

    if (!list || !product.variants) return;

    list.innerHTML = ''; 
    
    product.variants.forEach(v => {
        const stockCount = parseInt(v.stock || 0); // Note: Ensure your DB uses 'stock' or 'quantity'
        const hasStock = stockCount > 0;
        const btn = document.createElement('button');
        
        // Dynamic styling: Sold out items get a 'cursor-pointer' now so they can be clicked
        btn.className = `w-full text-left px-4 py-3 text-sm font-bold border-b border-gray-50 flex justify-between items-center transition-colors ${
            hasStock ? 'hover:bg-gray-50' : 'bg-gray-50/50 text-gray-400 cursor-pointer'
        }`;
        
        btn.innerHTML = `
            <span class="${!hasStock ? 'line-through opacity-50' : ''}">US ${v.size}</span>
            <span class="text-[10px] uppercase tracking-widest font-medium ${!hasStock ? 'text-red-500' : ''}">
                ${hasStock ? `${stockCount} Available` : 'Sold Out'}
            </span>`;

        // Updated Click Logic: Handles both In-Stock and Sold-Out
        btn.onclick = (e) => {
            e.stopPropagation();
            
            if (hasStock) {
                // Standard selection logic
                window.selectedSize = v.size;
                displaySpan.textContent = `US ${v.size}`;
                displaySpan.classList.replace('text-gray-500', 'text-black');
                dropdownMenu.classList.add('hidden');
            } else {
                // "Sold Out" Logic: Trigger the Notify Modal
                // We pass 'product' and the specific 'v.size' to pre-fill the modal
                openNotifyModal(product, `US ${v.size}`);
                dropdownMenu.classList.add('hidden');
            }
        };

        list.appendChild(btn);
    });
}

function initializeUnlimitedGallery(product) {
    const gallery = document.getElementById('main-gallery');
    const thumbContainer = document.getElementById('thumb-container');
    
    // Safety check: if the HTML elements aren't there, stop the script
    if (!gallery) {
        console.error("Critical Error: 'main-gallery' element missing from HTML.");
        return;
    }

    // Handle the Postgres '_text' array type correctly
    const galleryImages = Array.isArray(product.image_gallery) ? product.image_gallery : [];
    const images = [product.image_url, ...galleryImages].filter(Boolean);
    
    gallery.innerHTML = ''; 
    if (thumbContainer) thumbContainer.innerHTML = ''; 
    
    images.forEach((url, index) => {
        const slide = document.createElement('div');
        slide.className = "gallery-slide min-w-full h-full flex-shrink-0 flex items-center justify-center";
        slide.innerHTML = `<img src="${url}" class="max-w-full max-h-full object-contain">`;
        gallery.appendChild(slide);

        if (thumbContainer) {
            const thumb = document.createElement('button');
            thumb.className = `thumb-btn w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${index === 0 ? 'border-black active' : 'border-transparent'}`;
            thumb.innerHTML = `<img src="${url}" class="w-full h-full object-cover">`;
            thumb.onclick = () => {
                gallery.scrollTo({ left: gallery.offsetWidth * index, behavior: 'smooth' });
                document.querySelectorAll('.thumb-btn').forEach(b => b.classList.remove('border-black', 'active'));
                thumb.classList.add('border-black', 'active');
            };
            thumbContainer.appendChild(thumb);
        }
    });
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

    const display = document.getElementById('selected-size-display');
    const menu = document.getElementById('size-dropdown-menu');

    if (display) {
        display.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('hidden');
        });
    }

    document.querySelectorAll('.accordion-trigger').forEach(trigger => {
        trigger.addEventListener('click', () => {
            const content = trigger.nextElementSibling;
            const icon = trigger.querySelector('i');
            content.classList.toggle('hidden');
            if (icon) icon.style.transform = content.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(45deg)';
        });
    });

    window.addEventListener('click', () => menu?.classList.add('hidden'));
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