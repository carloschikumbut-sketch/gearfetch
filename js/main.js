/**
 * MASTER MAIN.JS - SNEAKERLAB 2026
 * Combined: Mobile Drawer, Auto-inject Cart, Size Selector, CRUD Cart, and Auth Logic.
 */

// 1. GLOBAL STATE & UNIFIED KEYS
const USER_KEY = 'sneaker-lab-user';
const CART_KEY = 'sneaker-lab-cart';

// Add the missing mockLogin function here so all pages can use it
function mockLogin(email = "sneakerhead@lab.com") {
    const userData = {
        isLoggedIn: true,
        name: email.split('@')[0].toUpperCase(),
        email: email,
        lastLogin: new Date().toISOString()
    };
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    
    // Check if there was a page we were trying to reach
    const destination = sessionStorage.getItem('redirect_after_login') || "profile.html";
    sessionStorage.removeItem('redirect_after_login');
    window.location.href = destination;
}

window.currentSelectedSize = null;
window.currentProduct = null;

// 2. INITIALIZATION ON PAGE LOAD
document.addEventListener('DOMContentLoaded', () => {
    // A. AUTO-INJECT CART HTML
    injectCartHTML();

    // B. MOBILE DRAWER LOGIC
    setupMobileMenu();

    // C. AUTH FORM LISTENERS
    const regForm = document.getElementById('register-form');
    if (regForm) {
        regForm.addEventListener('submit', (e) => {
            e.preventDefault();
            showVerificationStep();
        });
    }

    const logForm = document.getElementById('login-form');
    if (logForm) {
        logForm.addEventListener('submit', (e) => {
            e.preventDefault();
            mockLogin();
        });
    }

    // D. SYNC EVERYTHING
    updateCartBadge();
    checkUserSession();
    initHeaderCart();
    // Replace the direct call with this:
if (typeof initNotifySystem === "function") {
    initNotifySystem();
}
});

// 3. HEADER & CART UI LOGIC
function injectCartHTML() {
    if (document.getElementById('cart-sidebar')) return;
    const cartHTML = `
        <div id="cart-overlay" class="fixed inset-0 bg-black/50 z-[999] hidden opacity-0 transition-opacity duration-300" onclick="closeCart()"></div>
        <div id="cart-sidebar" class="fixed top-0 right-0 h-full w-[90%] md:w-[450px] bg-white z-[1000] transform translate-x-full transition-transform duration-500 flex flex-col shadow-2xl">
            <div class="p-6 border-b flex justify-between items-center bg-white">
                <h2 class="text-xl font-bold uppercase tracking-widest text-black">Your Bag</h2>
                <button onclick="closeCart()" class="p-2 hover:rotate-90 transition-transform duration-300">
                    <i class="fa-solid fa-xmark text-2xl"></i>
                </button>
            </div>
            <div id="side-cart-items" class="flex-1 overflow-y-auto p-6 space-y-6"></div>
            <div id="side-cart-footer" class="p-6 border-t bg-white space-y-4">
                <div class="flex justify-between items-center px-2">
                    <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Subtotal</span>
                    <span id="side-subtotal" class="text-xl font-black tracking-tight text-black">$0.00</span>
                </div>
                <p class="text-[9px] text-center text-gray-400 font-bold uppercase tracking-widest px-4 leading-relaxed">
                    Taxes and shipping calculated at checkout.
                </p>
                <button onclick="window.location.href='checkout.html'" class="w-full bg-black text-white py-5 font-bold uppercase tracking-[0.3em] text-xs hover:bg-red-600 transition-all active:scale-[0.98]">
                    Secure Checkout
                </button>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', cartHTML);
}

const initHeaderCart = () => {
    // Listen for both the standard button and any custom cart icons
    document.addEventListener('click', (e) => {
        if (e.target.closest('#header-cart-btn') || e.target.closest('.icon-cart')) {
            e.preventDefault();
            openCart();
        }
    });
};

// 4. SIZE SELECTOR & NOTIFY SYSTEM
// --- COMBINED SIZE SELECTOR & NOTIFY SYSTEM ---


// 5. CART CRUD OPERATIONS
function renderSideCart() {
    const container = document.getElementById('side-cart-items');
    const subtotalElement = document.getElementById('side-subtotal');
    const cartData = JSON.parse(localStorage.getItem(CART_KEY)) || [];

    if (!container) return;

    if (cartData.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-64 opacity-40">
                <i class="fa-solid fa-bag-shopping text-4xl mb-4"></i>
                <p class="uppercase text-[10px] font-black tracking-widest">Your bag is empty</p>
            </div>`;
        if (subtotalElement) subtotalElement.innerText = "$0.00";
        return;
    }

    let subtotal = 0;
    container.innerHTML = cartData.map((item, index) => {
        const price = parseFloat(item.price) || 0;
        const qty = parseInt(item.quantity) || 1;
        subtotal += price * qty;
        
        return `
            <div class="flex gap-4 items-center bg-zinc-50/50 p-3 rounded-2xl">
                <div class="w-20 h-20 bg-white rounded-xl p-2 flex-shrink-0 shadow-sm">
                    <img src="${item.image_url || item.image}" class="w-full h-full object-contain mix-blend-multiply">
                </div>
                <div class="flex-1">
                    <div class="flex justify-between items-start">
                        <h4 class="text-[10px] font-black uppercase tracking-tight leading-none max-w-[120px]">${item.name}</h4>
                        <button onclick="removeFromCart(${index})" class="text-zinc-300 hover:text-red-600 transition-colors">
                            <i class="fa-solid fa-xmark text-sm"></i>
                        </button>
                    </div>
                    <p class="text-[9px] text-zinc-400 font-bold uppercase mt-1">SIZE: <span class="text-black">${item.size || 'Default'}</span></p>
                    <div class="flex justify-between items-center mt-3">
                         <div class="flex border border-zinc-200 rounded-lg items-center bg-white overflow-hidden shadow-sm">
                            <button onclick="changeQty(${index}, -1)" class="px-3 py-1 text-xs hover:bg-zinc-100">-</button>
                            <span class="px-2 text-[10px] font-black w-6 text-center">${qty}</span>
                            <button onclick="changeQty(${index}, 1)" class="px-3 py-1 text-xs hover:bg-zinc-100">+</button>
                         </div>
                         <p class="font-black text-sm text-black">$${(price * qty).toFixed(2)}</p>
                    </div>
                </div>
            </div>`;
    }).join('');

    if (subtotalElement) subtotalElement.innerText = `$${subtotal.toFixed(2)}`;
}

window.changeQty = (index, delta) => {
    let cartData = JSON.parse(localStorage.getItem(CART_KEY)) || [];
    if (!cartData[index]) return;
    
    const newQty = (cartData[index].quantity || 1) + delta;
    
    // Check Max Stock
    if (delta > 0 && cartData[index].maxStock && newQty > cartData[index].maxStock) {
        alert("No more stock available.");
        return;
    }

    cartData[index].quantity = newQty;
    if (cartData[index].quantity < 1) return removeFromCart(index);
    
    localStorage.setItem(CART_KEY, JSON.stringify(cartData));
    renderSideCart();
    updateCartBadge();
};

window.removeFromCart = (index) => {
    let cartData = JSON.parse(localStorage.getItem(CART_KEY)) || [];
    cartData.splice(index, 1);
    localStorage.setItem(CART_KEY, JSON.stringify(cartData));
    renderSideCart();
    updateCartBadge();
};

// 6. AUTH & SESSION LOGIC
function showVerificationStep() {
    document.getElementById('auth-tabs')?.classList.add('hidden');
    document.getElementById('login-form')?.classList.add('hidden');
    document.getElementById('register-form')?.classList.add('hidden');
    
    const verifySection = document.getElementById('verify-section');
    if(verifySection) {
        verifySection.classList.remove('hidden');
        document.getElementById('otp-input')?.focus();
    }
}

window.verifyMyCode = () => {
    const input = document.getElementById('otp-input');
    if (input && input.value === "123456") {
        mockLogin();
    } else {
        alert("Invalid code. Use 123456 for testing.");
    }
};

function checkUserSession() {
    const user = JSON.parse(localStorage.getItem(USER_KEY));
    const authUI = document.getElementById('auth-status-container'); // Container for Login vs Profile icon
    
    if (user && user.isLoggedIn) {
        // Show Profile Icon / Initials
        renderUserLoggedInUI(user);
    } else {
        // Show Login/Register Button
        renderGuestUI();
    }
}

function renderUserLoggedInUI(user) {
    const circle = document.getElementById('user-initials-circle');
    if (circle && user.name) {
        const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        circle.innerHTML = initials;
        circle.style.display = "flex";
        circle.classList.add('bg-black', 'text-white', 'border-2', 'border-red-600');
    }
}
window.handleLogout = () => {
    if (confirm("Are you sure you want to log out?")) {
        localStorage.removeItem(USER_KEY);
        // Optional: Also clear the cart on logout if you want a fresh start
        // localStorage.removeItem(CART_KEY); 
        window.location.href = "index.html";
    }
};

// 7. UTILITY & UI HELPERS
function updateCartBadge() {
    const badges = document.querySelectorAll('.cart-count, #cart-badge');
    const cartData = JSON.parse(localStorage.getItem(CART_KEY)) || [];
    const totalItems = cartData.reduce((total, item) => total + (item.quantity || 1), 0);
    
    badges.forEach(badge => {
        badge.innerText = totalItems;
        if (totalItems > 0) {
            badge.classList.remove('hidden');
            badge.style.display = "flex";
        } else {
            badge.classList.add('hidden');
            badge.style.display = "none";
        }
    });
}

function setupMobileMenu() {
    const trigger = document.getElementById('mobile-menu-trigger');
    const drawer = document.getElementById('mobile-drawer');
    const close = document.getElementById('drawer-close');
    const overlay = document.getElementById('drawer-overlay');

    if (trigger && drawer) {
        trigger.onclick = (e) => {
            e.preventDefault();
            drawer.classList.add('active');
            if (overlay) {
                overlay.style.display = 'block';
                setTimeout(() => overlay.style.opacity = '1', 10);
            }
            document.body.style.overflow = 'hidden';
        };

        const closeMenu = () => {
            drawer.classList.remove('active');
            if (overlay) {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.style.display = 'none', 300);
            }
            document.body.style.overflow = '';
        };

        if (close) close.onclick = closeMenu;
        if (overlay) overlay.onclick = closeMenu;

        // --- UPDATED DROPDOWN LOGIC ---
        const mobileDropdowns = drawer.querySelectorAll('.has-dropdown > .dropdown-trigger');
        mobileDropdowns.forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                const parent = btn.parentElement;
                const submenu = parent.querySelector('.submenu');
                
                // Toggle active class
                parent.classList.toggle('active');

                // Force Height for the animation
                if (submenu) {
                    if (parent.classList.contains('active')) {
                        submenu.style.maxHeight = submenu.scrollHeight + "px";
                        submenu.style.opacity = "1";
                    } else {
                        submenu.style.maxHeight = "0px";
                        submenu.style.opacity = "0";
                    }
                }

                // Rotate Icon
                const icon = btn.querySelector('i');
                if (icon) {
                    icon.style.transition = "transform 0.3s ease";
                    icon.style.transform = parent.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0deg)';
                }
            };
        });
    }
}

function openCart() {
    renderSideCart(); 
    const sidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('cart-overlay');
    if (sidebar && overlay) {
        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        setTimeout(() => {
            sidebar.style.transform = 'translateX(0)';
            overlay.classList.add('opacity-100');
        }, 10);
    }
}

function closeCart() {
    const sidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('cart-overlay');
    if (sidebar && overlay) {
        sidebar.style.transform = 'translateX(100%)';
        overlay.classList.remove('opacity-100');
        setTimeout(() => {
            overlay.classList.add('hidden');
            document.body.style.overflow = ''; 
        }, 400);
    }
}

function openNotifyModal() {
    const modal = document.getElementById('notify-modal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        // Auto-fill size if already selected
        if (window.currentSelectedSize) {
            const input = document.getElementById('modal-size-input');
            if (input) input.value = window.currentSelectedSize;
        }
    }
}

function closeNotifyModal() {
    const modal = document.getElementById('notify-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}
// Add this to main.js
window.onload = () => {
    const user = JSON.parse(localStorage.getItem('sneaker-lab-user'));
    if (user && user.isLoggedIn) {
        console.log("Welcome back, " + user.name);
        // Update your UI here (e.g., change 'Login' text to 'My Account')
    }
};




/**
 * GLOBAL ANNOUNCEMENT BAR ROTATION
 * Targets any page with #announcement-text
 */
document.addEventListener('DOMContentLoaded', () => {
    const announcementEl = document.getElementById('announcement-text');
    
    // Only run if the element actually exists on the current page
    if (announcementEl) {
        const announcements = [
            "FREE DELIVERY ON ALL ORDERS OVER $150!",
            "SAME-DAY Delivery in Harare | NEXT-DAY Nationwide Pickup Points",
            "NEW DROPS EVERY WEEK - STAY TUNED",
            "WE ACCEPT ALL LOCAL PAYMENT METHODS - ECOCASH, INNBUCKS & MORE",
            "SECURE PAYMENTS & FAST NATIONWIDE DELIVERY"
            
        ];

        let currentIndex = 0;

        setInterval(() => {
            // 1. Fade out effect
            announcementEl.style.opacity = '0';

            setTimeout(() => {
                // 2. Change text once invisible
                currentIndex = (currentIndex + 1) % announcements.length;
                announcementEl.textContent = announcements[currentIndex];
                
                // 3. Fade back in
                announcementEl.style.opacity = '1';
            }, 500); // Wait for fade out to finish
        }, 5000); // Change every 5 seconds
    }
});




/**
 * GLOBAL USER SESSION TRACKER
 * Updates all account icons/initials across the site
 */
async function updateGlobalUserUI() {
    // 1. Check for active session
    const { data: { session }, error } = await window._supabase.auth.getSession();

    if (session && session.user) {
        const user = session.user;
        let initials = "";

        // 2. Determine Initials
        // Priority: Full Name from Metadata -> Display Name -> Email
        const fullName = user.user_metadata?.full_name;
        const email = user.email;

        if (fullName) {
            const names = fullName.split(' ');
            initials = names.length > 1 
                ? (names[0][0] + names[1][0]).toUpperCase() 
                : names[0][0].toUpperCase();
        } else {
            // Fallback to first two letters of email
            initials = email.substring(0, 2).toUpperCase();
        }

        // 3. Find and Update all UI elements
        // This targets the specific ID you provided
        const initialContainers = document.querySelectorAll('#user-initials-circle');
        
        initialContainers.forEach(container => {
            // Replace the FontAwesome <i> tag with the initials text
            container.innerHTML = `<span class="animate-fade-in">${initials}</span>`;
            
            // Optional: Change background to brand color to show "Logged In" status
            if (container.parentElement) {
                container.parentElement.style.background = '#dc2626';
                container.parentElement.style.color = '#FFFFFF';
            }
        });

        // 4. Update Drawer/Sidebar "Sign In" buttons if they exist
        const drawerStatus = document.getElementById('drawer-user-status');
        if (drawerStatus) {
            drawerStatus.innerHTML = `
                <a href="account.html" style="display: block; background: #111; color: #fff !important; text-align: center; padding: 16px 0; font-weight: 700; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; border-radius: 8px; text-decoration: none;">
                    MY ACCOUNT
                </a>
            `;
        }
    }
}

// RUN ON EVERY PAGE LOAD
document.addEventListener('DOMContentLoaded', () => {
    updateGlobalUserUI();
});