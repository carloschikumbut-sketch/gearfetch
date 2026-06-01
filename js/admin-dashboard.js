/**
 * admin-dashboard.js
 * Cleaned and synchronized with the provided HTML and Database Schema.
 * Includes Multi-Select Category Array logic.
 */

// ─────────────────────────────────────────────
//  SAFE DB GETTER
// ─────────────────────────────────────────────
function _db() {
    if (!window._supabase) {
        console.error("CRITICAL: window._supabase not set. Check supabase-config.js loads before this file.");
        return null;
    }
    return window._supabase;
}

// ─────────────────────────────────────────────
//  UI HELPERS (Toast & Loading)
// ─────────────────────────────────────────────
function showToast(message, type = "success") {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.cssText = `
        position:fixed; bottom:20px; right:20px; padding:12px 24px; border-radius:8px; color:white;
        font-weight:bold; z-index:9999; background:${type === 'success' ? '#008060' : '#ef4444'};
        box-shadow:0 4px 12px rgba(0,0,0,0.15); display:block;
    `;
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

function setLoading(button, isLoading, originalText = "Save Product") {
    if (!button) return;
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...`;
    } else {
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

// ─────────────────────────────────────────────
//  INVENTORY — ADD / UPDATE PRODUCT
// ─────────────────────────────────────────────
const inventoryForm = document.getElementById('inventory-form');

if (inventoryForm) {
    inventoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const saveBtn = document.querySelector('.btn-primary');
        
        const isUpdate = saveBtn && saveBtn.innerText.trim() === "Update Product";
        const productId = inventoryForm.getAttribute('data-edit-id');

        const name = document.getElementById('prod-title').value;
        const price = document.getElementById('prod-price').value;
        const brand = document.getElementById('prod-brand').value;
        const desc = document.getElementById('prod-desc').value;
        const fileInput = document.getElementById('prod-gallery-files');
        const files = fileInput ? fileInput.files : [];

        // Collect Multi-Select Categories as an Array
        const categorySelect = document.getElementById('prod-cat');
        const selectedCategories = Array.from(categorySelect.selectedOptions).map(opt => opt.value);

        if (!isUpdate && !files.length) {
            alert("Please select at least one sneaker image.");
            return;
        }

        setLoading(saveBtn, true, isUpdate ? "Update Product" : "Save Product");

        if (isUpdate) {
            await updateExistingProduct(productId, selectedCategories);
        } else {
            await handleProductUpload(name, price, brand, desc, files, selectedCategories);
        }

        setLoading(saveBtn, false, isUpdate ? "Update Product" : "Save Product");
    });
}

async function handleProductUpload(name, price, brand, desc, files, selectedCategories) {
    const supabase = _db();
    try {
        const uploadedUrls = [];
        for (const file of files) {
            const ext = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
            const filePath = `products/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('sneaker-images') 
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('sneaker-images')
                .getPublicUrl(filePath);

            uploadedUrls.push(publicUrl);
        }

        await addSneakerToSupabase(name, price, brand, uploadedUrls, desc, selectedCategories);
        inventoryForm.reset();
        refreshInventoryList();
    } catch (err) {
        alert("Upload Failed: " + err.message);
    }
}

async function addSneakerToSupabase(name, price, brand, imgUrls, desc, selectedCategories) {
    const supabase = _db();
    try {
        const comparePrice = document.getElementById('prod-compare-price')?.value;
        const colorway = document.getElementById('prod-colorway')?.value;
        const status = document.getElementById('prod-status')?.value;

        const variantRows = document.querySelectorAll('#variant-list tr');
        let totalStock = 0;
        const variantsArr = Array.from(variantRows).map(row => {
            const size = row.querySelector('.v-size')?.value || '';
            const stock = parseInt(row.querySelector('.v-stock')?.value || 0);
            totalStock += stock;
            return { size, stock };
        });

        const { error } = await supabase.from('products').insert([{
            name,
            price: parseFloat(price),
            compare_at_price: comparePrice ? parseFloat(comparePrice) : null,
            brand: brand.toUpperCase().trim(),
            colorway: colorway || '',
            description: desc,
            category: selectedCategories, // Sent as Array: ["sneakers", "latest"]
            status: status || 'active',
            stock_quantity: totalStock,
            variants: variantsArr, 
            image_url: imgUrls[0] || '',
            image_gallery: imgUrls
        }]);

        if (error) throw error;
        showToast("Product added successfully!");
        setTimeout(() => location.reload(), 1000);
    } catch (err) {
        alert("Database Error: " + err.message);
    }
}

// ─────────────────────────────────────────────
//  REFRESH LIST & DELETE
// ─────────────────────────────────────────────
async function refreshInventoryList() {
    const supabase = _db();
    const tbody = document.getElementById('inventory-list-body');
    if (!tbody) return;

    const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return;

    tbody.innerHTML = products.length ? products.map(item => `
        <tr data-id="${item.id}">
            <td>
                <img src="${item.image_url || 'placeholder.jpg'}" alt="product">
            </td>
            <td>
                <div style="font-weight: 700; font-size: 14px;">${item.name}</div>
                <div style="color: var(--text-sub); font-size: 12px; text-transform: uppercase;">${item.brand || ''}</div>
            </td>
            <td>$${parseFloat(item.price).toFixed(2)}</td>
            <td>
                <button onclick="editProduct('${item.id}')" class="btn-action" title="Edit">
                    <i class="fa-solid fa-pen" style="color: #4f46e5;"></i>
                </button>
                <button onclick="deleteProduct('${item.id}')" class="btn-action" title="Delete">
                    <i class="fa-solid fa-trash" style="color: var(--primary);"></i>
                </button>
            </td>
        </tr>
    `).join('') : '<tr><td colspan="4" style="text-align:center; padding:40px;">No products found.</td></tr>';
}

window.deleteProduct = async (id) => {
    const supabase = _db();
    if (confirm("Delete this product?")) {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) alert(error.message);
        else {
            showToast("Product deleted");
            refreshInventoryList();
        }
    }
};

// ─────────────────────────────────────────────
//  EDIT & UPDATE LOGIC
// ─────────────────────────────────────────────
window.editProduct = async (productId) => {
    const supabase = _db();
    const { data: product } = await supabase.from('products').select('*').eq('id', productId).single();

    document.getElementById('prod-title').value = product.name;
    document.getElementById('prod-price').value = product.price;
    document.getElementById('prod-brand').value = product.brand;
    document.getElementById('prod-desc').value = product.description;
    document.getElementById('prod-colorway').value = product.colorway || '';
    document.getElementById('prod-compare-price').value = product.compare_at_price || '';
    
    // Set Multi-Select Categories on Edit
    const categorySelect = document.getElementById('prod-cat');
    Array.from(categorySelect.options).forEach(option => {
        option.selected = product.category && product.category.includes(option.value);
    });

    const variantTable = document.getElementById('variant-list');
    variantTable.innerHTML = '';
    if (product.variants) {
        product.variants.forEach(v => {
            const row = variantTable.insertRow();
            row.innerHTML = `
                <td><input type="text" value="${v.size}" class="v-size"></td>
                <td><input type="number" value="${v.stock}" class="v-stock"></td>
                <td><button type="button" onclick="this.closest('tr').remove()"><i class="fa-solid fa-trash"></i></button></td>
            `;
        });
    }

    const saveBtn = document.querySelector('.btn-primary');
    saveBtn.innerText = "Update Product";
    inventoryForm.setAttribute('data-edit-id', productId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

async function updateExistingProduct(productId, selectedCategories) {
    const supabase = _db();
    const variantRows = document.querySelectorAll('#variant-list tr');
    const variantsArr = Array.from(variantRows).map(row => ({
        size: row.querySelector('.v-size').value,
        stock: parseInt(row.querySelector('.v-stock').value)
    }));

    const updatedData = {
        name: document.getElementById('prod-title').value,
        price: parseFloat(document.getElementById('prod-price').value),
        brand: document.getElementById('prod-brand').value,
        colorway: document.getElementById('prod-colorway').value,
        description: document.getElementById('prod-desc').value,
        category: selectedCategories, // Updated as Array
        variants: variantsArr,
        stock_quantity: variantsArr.reduce((acc, v) => acc + v.stock, 0)
    };

    const { error } = await supabase.from('products').update(updatedData).eq('id', productId);
    if (error) alert(error.message);
    else {
        showToast("Product updated!");
        location.reload();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('inventory-list-body')) {
        refreshInventoryList();
    }
});