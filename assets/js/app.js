// =============================================
        // INITIALIZATION AND DATA SETUP
        // =============================================
        
        // Sample food menu data
        const menuItems = [
            {
                id: 1,
                name: "Cake Pop",
                description: "A form of cake styled as a lollipop",
                price: 20,
                category: "Dessert",
                image: "https://media.istockphoto.com/id/951100466/photo/cake-pops-sweet-food.jpg?s=612x612&w=0&k=20&c=5O9BY89LDwQVyev75eMNoXEWiW__0ip_X_kD1RXwjkU="
            }
        ];

        // Admin credentials
        const adminCredentials = {
            username: "admin@crumbco",
            password: "admin@crumbco1234"
        };

        // Cart state
        let cart = [];

        // Database setup
        let db;
        const DB_NAME = "FoodExpressDB";
        const DB_VERSION = 1;
        const ORDER_STORE = "orders";

        // =============================================
        // DATABASE FUNCTIONS (IndexedDB)
        // =============================================

        // Initialize the database
        function initDatabase() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, DB_VERSION);
                
                request.onerror = () => {
                    console.error("Database failed to open");
                    reject("Database error");
                };
                
                request.onsuccess = () => {
                    db = request.result;
                    console.log("Database opened successfully");
                    resolve(db);
                };
                
                request.onupgradeneeded = (e) => {
                    const database = e.target.result;
                    
                    // Create the orders object store if it doesn't exist
                    if (!database.objectStoreNames.contains(ORDER_STORE)) {
                        const store = database.createObjectStore(ORDER_STORE, { 
                            keyPath: "id",
                            autoIncrement: true 
                        });
                        
                        // Create indexes for efficient querying
                        store.createIndex("customerName", "customerName", { unique: false });
                        store.createIndex("email", "email", { unique: false });
                        store.createIndex("date", "date", { unique: false });
                    }
                };
            });
        }

        // Add an order to the database
        function addOrder(order) {
            return new Promise((resolve, reject) => {
                if (!db) {
                    reject("Database not initialized");
                    return;
                }
                
                const transaction = db.transaction([ORDER_STORE], "readwrite");
                const store = transaction.objectStore(ORDER_STORE);
                
                const request = store.add(order);
                
                request.onsuccess = () => {
                    resolve(request.result);
                };
                
                request.onerror = () => {
                    reject(request.error);
                };
            });
        }

        // Get all orders from the database
        function getAllOrders() {
            return new Promise((resolve, reject) => {
                if (!db) {
                    reject("Database not initialized");
                    return;
                }
                
                const transaction = db.transaction([ORDER_STORE], "readonly");
                const store = transaction.objectStore(ORDER_STORE);
                const request = store.getAll();
                
                request.onsuccess = () => {
                    resolve(request.result);
                };
                
                request.onerror = () => {
                    reject(request.error);
                };
            });
        }

        // Search orders by customer name or email
        function searchOrders(query) {
            return new Promise((resolve, reject) => {
                if (!db) {
                    reject("Database not initialized");
                    return;
                }
                
                getAllOrders().then(orders => {
                    const results = orders.filter(order => 
                        order.customerName.toLowerCase().includes(query.toLowerCase()) || 
                        order.email.toLowerCase().includes(query.toLowerCase())
                    );
                    resolve(results);
                }).catch(reject);
            });
        }

        // =============================================
        // CART MANAGEMENT FUNCTIONS
        // =============================================

        // Add item to cart
        function addToCart(itemId) {
            const item = menuItems.find(i => i.id === itemId);
            
            if (!item) return;
            
            const existingItem = cart.find(i => i.id === itemId);
            
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({
                    ...item,
                    quantity: 1
                });
            }
            
            updateCartUI();
            saveCartToStorage();
        }

        // Remove item from cart
        function removeFromCart(itemId) {
            cart = cart.filter(item => item.id !== itemId);
            updateCartUI();
            saveCartToStorage();
        }

        // Update item quantity in cart
        function updateItemQuantity(itemId, quantity) {
            const item = cart.find(i => i.id === itemId);
            
            if (item) {
                if (quantity <= 0) {
                    removeFromCart(itemId);
                } else {
                    item.quantity = quantity;
                }
                
                updateCartUI();
                saveCartToStorage();
            }
        }

        // Calculate cart totals
        function calculateCartTotals() {
            const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
            const tax = subtotal * 0.08; // 8% tax
            const total = subtotal + tax;
            
            return {
                subtotal: subtotal.toFixed(2),
                tax: tax.toFixed(2),
                total: total.toFixed(2)
            };
        }

        // Save cart to localStorage (fallback)
        function saveCartToStorage() {
            localStorage.setItem('foodexpress_cart', JSON.stringify(cart));
        }

        // Load cart from localStorage (fallback)
        function loadCartFromStorage() {
            const savedCart = localStorage.getItem('foodexpress_cart');
            if (savedCart) {
                cart = JSON.parse(savedCart);
                updateCartUI();
            }
        }

        // Clear cart
        function clearCart() {
            cart = [];
            updateCartUI();
            saveCartToStorage();
        }

        // =============================================
        // UI UPDATE FUNCTIONS
        // =============================================

        // Update cart UI
        function updateCartUI() {
            const cartCount = document.querySelector('.cart-count');
            const cartItemsContainer = document.getElementById('cart-items-container');
            const emptyCartMessage = document.getElementById('empty-cart-message');
            const cartSummary = document.getElementById('cart-summary');
            
            // Update cart count
            const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
            cartCount.textContent = totalItems;
            
            // Clear cart items container
            cartItemsContainer.querySelectorAll('.cart-item').forEach(el => el.remove());
            
            if (cart.length === 0) {
                emptyCartMessage.style.display = 'block';
                cartSummary.style.display = 'none';
                return;
            }
            
            emptyCartMessage.style.display = 'none';
            cartSummary.style.display = 'block';
            
            // Add items to cart UI
            cart.forEach(item => {
                const cartItemEl = document.createElement('div');
                cartItemEl.className = 'cart-item';
                cartItemEl.innerHTML = `
                    <img src="${item.image}" alt="${item.name}" class="cart-item-image">
                    <div class="cart-item-details">
                        <div class="cart-item-title">${item.name}</div>
                        <div class="cart-item-price">₱${item.price.toFixed(2)}</div>
                    </div>
                    <div class="cart-item-controls">
                        <div class="quantity-control">
                            <button class="quantity-btn minus" data-id="${item.id}">-</button>
                            <input type="number" class="quantity-input" value="${item.quantity}" min="1" data-id="${item.id}">
                            <button class="quantity-btn plus" data-id="${item.id}">+</button>
                        </div>
                        <button class="remove-btn" data-id="${item.id}">Remove</button>
                    </div>
                `;
                
                cartItemsContainer.appendChild(cartItemEl);
            });
            
            // Update cart summary
            const totals = calculateCartTotals();
            document.getElementById('cart-subtotal').textContent = `₱${totals.subtotal}`;
            document.getElementById('cart-tax').textContent = `₱${totals.tax}`;
            document.getElementById('cart-total').textContent = `₱${totals.total}`;
            
            // Update checkout summary if on checkout page
            if (document.getElementById('checkout').classList.contains('active')) {
                document.getElementById('checkout-subtotal').textContent = `₱${totals.subtotal}`;
                document.getElementById('checkout-tax').textContent = `₱${totals.tax}`;
                document.getElementById('checkout-total').textContent = `₱${totals.total}`;
            }
        }

        // Render menu items
        function renderMenuItems(items = menuItems) {
            const menuGrid = document.getElementById('menu-items');
            menuGrid.innerHTML = '';
            
            items.forEach(item => {
                const menuItemEl = document.createElement('div');
                menuItemEl.className = 'menu-item';
                menuItemEl.innerHTML = `
                    <img src="${item.image}" alt="${item.name}" class="menu-item-image">
                    <div class="menu-item-content">
                        <h3 class="menu-item-title">${item.name}</h3>
                        <p class="menu-item-description">${item.description}</p>
                        <div class="menu-item-footer">
                            <span class="menu-item-price">₱${item.price.toFixed(2)}</span>
                            <button class="add-to-cart-btn" data-id="${item.id}">Add to Cart</button>
                        </div>
                    </div>
                `;
                
                menuGrid.appendChild(menuItemEl);
            });
        }

        // Filter menu items
        function filterMenuItems() {
            const searchText = document.querySelector('.search-input').value.toLowerCase();
            const categoryFilter = document.getElementById('category-filter').value;
            const priceFilter = document.getElementById('price-filter').value;
            
            const filteredItems = menuItems.filter(item => {
                // Search filter
                const matchesSearch = item.name.toLowerCase().includes(searchText) || 
                                    item.description.toLowerCase().includes(searchText);
                
                // Category filter
                const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
                
                // Price filter
                let matchesPrice = true;
                if (priceFilter !== 'all') {
                    const [min, max] = priceFilter.split('-').map(Number);
                    if (priceFilter.endsWith('+')) {
                        matchesPrice = item.price >= 20;
                    } else {
                        matchesPrice = item.price >= min && item.price <= max;
                    }
                }
                
                return matchesSearch && matchesCategory && matchesPrice;
            });
            
            renderMenuItems(filteredItems);
        }

        // Render orders table in admin dashboard
        function renderOrdersTable(orders) {
            const tableBody = document.getElementById('orders-table-body');
            tableBody.innerHTML = '';
            
            if (orders.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = `<td colspan="7" style="text-align: center;">No orders found</td>`;
                tableBody.appendChild(row);
                return;
            }
            
            orders.forEach(order => {
                const row = document.createElement('tr');
                
                // Format items list
                const itemsList = order.items.map(item => 
                    `${item.quantity}x ${item.name} (₱${item.price})`
                ).join(', ');
                
                // Format date
                const orderDate = new Date(order.date);
                const formattedDate = orderDate.toLocaleDateString() + ' ' + orderDate.toLocaleTimeString();
                
                row.innerHTML = `
                    <td>${order.id}</td>
                    <td>${order.customerName}</td>
                    <td>${order.email}</td>
                    <td>${itemsList}</td>
                    <td>$${order.total}</td>
                    <td>${formattedDate}</td>
                    <td>
                        <button class="action-btn view-receipt" data-id="${order.id}">View Receipt</button>
                    </td>
                `;
                
                tableBody.appendChild(row);
            });
        }

        // Generate and display receipt
        function generateReceipt(order) {
            const receiptEl = document.getElementById('receipt');
            
            // Format date
            const orderDate = new Date(order.date);
            const formattedDate = orderDate.toLocaleDateString() + ' ' + orderDate.toLocaleTimeString();
            
            // Create items table rows
            let itemsRows = '';
            order.items.forEach(item => {
                itemsRows += `
                    <tr>
                        <td>${item.quantity}x ${item.name}</td>
                        <td>$${item.price.toFixed(2)}</td>
                        <td>$${(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                `;
            });
            
            receiptEl.innerHTML = `
                <div class="receipt-header">
                    <h2>FoodExpress</h2>
                    <p>123 Food Street, City</p>
                    <p>Phone: (123) 456-7890</p>
                </div>
                
                <div class="receipt-details">
                    <p><strong>Order ID:</strong> ${order.id}</p>
                    <p><strong>Date:</strong> ${formattedDate}</p>
                    <p><strong>Customer:</strong> ${order.customerName}</p>
                    <p><strong>Address:</strong> ${order.address}</p>
                    <p><strong>Email:</strong> ${order.email}</p>
                </div>
                
                <table class="receipt-items">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsRows}
                    </tbody>
                </table>
                
                <div class="receipt-total">
                    <p>Subtotal: $${order.subtotal}</p>
                    <p>Tax (8%): $${order.tax}</p>
                    <p><strong>Total: $${order.total}</strong></p>
                </div>
                
                <p style="text-align: center; margin-top: 20px;">Thank you for your order!</p>
            `;
        }

        // =============================================
        // PAGE NAVIGATION FUNCTIONS
        // =============================================

        // Switch between pages
        function showPage(pageId) {
            // Hide all pages
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });
            
            // Show selected page
            document.getElementById(pageId).classList.add('active');
            
            // Update active nav link
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            
            const navLink = document.querySelector(`.nav-link[data-page="${pageId}"]`);
            if (navLink) {
                navLink.classList.add('active');
            }
            
            // Perform page-specific actions
            if (pageId === 'cart') {
                updateCartUI();
            } else if (pageId === 'admin-dashboard') {
                loadOrders();
            }
        }

        // =============================================
        // EVENT HANDLERS
        // =============================================

        // Handle menu item filtering
        function setupFilterHandlers() {
            document.querySelector('.search-btn').addEventListener('click', filterMenuItems);
            document.querySelector('.search-input').addEventListener('input', filterMenuItems);
            document.getElementById('category-filter').addEventListener('change', filterMenuItems);
            document.getElementById('price-filter').addEventListener('change', filterMenuItems);
        }

        // Handle cart interactions
        function setupCartHandlers() {
            // Event delegation for cart buttons
            document.getElementById('cart-items-container').addEventListener('click', (e) => {
                if (e.target.classList.contains('remove-btn')) {
                    const itemId = parseInt(e.target.getAttribute('data-id'));
                    removeFromCart(itemId);
                } else if (e.target.classList.contains('quantity-btn')) {
                    const itemId = parseInt(e.target.getAttribute('data-id'));
                    const input = document.querySelector(`.quantity-input[data-id="${itemId}"]`);
                    let quantity = parseInt(input.value);
                    
                    if (e.target.classList.contains('plus')) {
                        quantity += 1;
                    } else if (e.target.classList.contains('minus')) {
                        quantity -= 1;
                    }
                    
                    updateItemQuantity(itemId, quantity);
                }
            });
            
            // Handle quantity input changes
            document.getElementById('cart-items-container').addEventListener('change', (e) => {
                if (e.target.classList.contains('quantity-input')) {
                    const itemId = parseInt(e.target.getAttribute('data-id'));
                    const quantity = parseInt(e.target.value);
                    
                    if (!isNaN(quantity) && quantity > 0) {
                        updateItemQuantity(itemId, quantity);
                    }
                }
            });
            
            // Checkout button
            document.getElementById('checkout-btn').addEventListener('click', () => {
                showPage('checkout');
            });
        }

        // Handle checkout process
        function setupCheckoutHandlers() {
            document.getElementById('place-order-btn').addEventListener('click', () => {
                // Validate form
                const fullname = document.getElementById('fullname').value.trim();
                const address = document.getElementById('address').value.trim();
                const email = document.getElementById('email').value.trim();
                
                if (!fullname || !address || !email) {
                    alert('Please fill out all required fields');
                    return;
                }
                
                // Validate email format
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    alert('Please enter a valid email address');
                    return;
                }
                
                // Create order object
                const totals = calculateCartTotals();
                const order = {
                    customerName: fullname,
                    address: address,
                    email: email,
                    items: cart.map(item => ({
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity
                    })),
                    subtotal: totals.subtotal,
                    tax: totals.tax,
                    total: totals.total,
                    date: new Date().toISOString()
                };
                
                // Save order to database
                addOrder(order).then(orderId => {
                    order.id = orderId;
                    
                    // Generate receipt
                    generateReceipt(order);
                    
                    // Clear cart
                    clearCart();
                    
                    // Show confirmation page
                    showPage('confirmation');
                }).catch(error => {
                    console.error('Error saving order:', error);
                    alert('There was an error processing your order. Please try again.');
                });
            });
        }

        // Handle admin functionality
        function setupAdminHandlers() {
            // Login form
            document.getElementById('login-btn').addEventListener('click', () => {
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                
                if (username === adminCredentials.username && password === adminCredentials.password) {
                    showPage('admin-dashboard');
                } else {
                    alert('Invalid username or password');
                }
            });
            
            // Logout button
            document.getElementById('logout-btn').addEventListener('click', () => {
                showPage('admin-login');
            });
            
            // Export to CSV
            document.getElementById('export-csv-btn').addEventListener('click', () => {
                getAllOrders().then(orders => {
                    if (orders.length === 0) {
                        alert('No orders to export');
                        return;
                    }
                    
                    // Create CSV content
                    let csvContent = 'Order ID,Customer Name,Email,Address,Items,Subtotal,Tax,Total,Date\n';
                    
                    orders.forEach(order => {
                        const itemsList = order.items.map(item => 
                            `${item.quantity}x ${item.name} ($${item.price})`
                        ).join('; ');
                        
                        csvContent += `"${order.id}","${order.customerName}","${order.email}","${order.address}","${itemsList}",${order.subtotal},${order.tax},${order.total},"${order.date}"\n`;
                    });
                    
                    // Create download link
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.setAttribute('href', url);
                    link.setAttribute('download', 'foodexpress_orders.csv');
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                });
            });
            
            // Order search
            document.getElementById('order-search-btn').addEventListener('click', () => {
                const query = document.getElementById('order-search').value.trim();
                
                if (query) {
                    searchOrders(query).then(orders => {
                        renderOrdersTable(orders);
                    });
                } else {
                    loadOrders();
                }
            });
            
            // View receipt from admin dashboard
            document.getElementById('orders-table-body').addEventListener('click', (e) => {
                if (e.target.classList.contains('view-receipt')) {
                    const orderId = parseInt(e.target.getAttribute('data-id'));
                    
                    getAllOrders().then(orders => {
                        const order = orders.find(o => o.id === orderId);
                        if (order) {
                            generateReceipt(order);
                            showPage('confirmation');
                        }
                    });
                }
            });
        }

        // Handle navigation
        function setupNavigationHandlers() {
            // Nav links
            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const page = link.getAttribute('data-page');
                    showPage(page);
                });
            });
            
            // Back to menu button
            document.getElementById('back-to-menu-btn').addEventListener('click', () => {
                showPage('home');
            });
            
            // Print receipt button
            document.getElementById('print-receipt-btn').addEventListener('click', () => {
                window.print();
            });
        }

        // Handle add to cart buttons
        function setupMenuHandlers() {
            // Event delegation for add to cart buttons
            document.getElementById('menu-items').addEventListener('click', (e) => {
                if (e.target.classList.contains('add-to-cart-btn')) {
                    const itemId = parseInt(e.target.getAttribute('data-id'));
                    addToCart(itemId);
                    
                    // Show a quick confirmation
                    const originalText = e.target.textContent;
                    e.target.textContent = 'Added!';
                    e.target.style.backgroundColor = 'var(--success)';
                    
                    setTimeout(() => {
                        e.target.textContent = originalText;
                        e.target.style.backgroundColor = 'var(--primary)';
                    }, 1000);
                }
            });
        }

        // Load orders for admin dashboard
        function loadOrders() {
            getAllOrders().then(orders => {
                renderOrdersTable(orders);
            }).catch(error => {
                console.error('Error loading orders:', error);
            });
        }

        // =============================================
        // INITIALIZATION
        // =============================================

        // Initialize the application
        function initApp() {
            // Initialize database
            initDatabase().then(() => {
                console.log('Database initialized successfully');
            }).catch(error => {
                console.error('Failed to initialize database:', error);
                // Fallback to localStorage for orders
                alert('Note: Orders will be stored locally but may not persist between sessions.');
            });
            
            // Load cart from storage
            loadCartFromStorage();
            
            // Render menu items
            renderMenuItems();
            
            // Set up event handlers
            setupFilterHandlers();
            setupCartHandlers();
            setupCheckoutHandlers();
            setupAdminHandlers();
            setupNavigationHandlers();
            setupMenuHandlers();
            
            // Show home page by default
            showPage('home');
        }

        // Start the app when DOM is loaded
        document.addEventListener('DOMContentLoaded', initApp);