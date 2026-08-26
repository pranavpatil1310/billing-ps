const firebaseConfig = {
  apiKey: "AIzaSyD2po__btGn8Cm9L8sMgLZV65TI_66ZvOk",
  authDomain: "canteennnn.firebaseapp.com",
  projectId: "canteennnn",
  storageBucket: "canteennnn.firebasestorage.app",
  messagingSenderId: "957049527157",
  appId: "1:957049527157:web:d9ca5d5c8d4a9c1277d13c",
  measurementId: "G-9P5W4JGCGQ"
};

let db = null;
if (typeof firebase !== 'undefined') {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
}

// 1. Daily Token Reset Logic
const todayStr = new Date().toDateString();
if (localStorage.getItem('vb_last_date') !== todayStr) {
  localStorage.setItem('vb_token', 1);
  localStorage.setItem('vb_last_date', todayStr);
}

// 2. Empty Default Menu (Upload via Admin now)
const defaultMenu = [];

const state = {
  menu: JSON.parse(localStorage.getItem('vb_menu')) || defaultMenu,
  cart: new Map(),
  token: parseInt(localStorage.getItem('vb_token')) || 1,
  activeCat: 'All',
  searchQuery: ''
};

if (!localStorage.getItem('vb_menu')) {
  localStorage.setItem('vb_menu', JSON.stringify(defaultMenu));
}

const DOM = {};

document.addEventListener('DOMContentLoaded', () => {
  DOM.catBar = document.getElementById('catBar');
  DOM.itemGrid = document.getElementById('itemGrid');
  DOM.cartList = document.getElementById('cartList');
  DOM.totalPayable = document.getElementById('totalPayable');
  DOM.topCartQty = document.getElementById('topCartQty');
  DOM.tokenDisplay = document.getElementById('tokenDisplay');
  DOM.modalToken = document.getElementById('modalToken');

  renderCategories();
  renderItems();
  updateTokenUI();

  if (db) {
    db.collection('menu').onSnapshot((snapshot) => {
      if (!snapshot.empty) {
        const cloudMenu = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        state.menu = cloudMenu;
        localStorage.setItem('vb_menu', JSON.stringify(cloudMenu));
        renderCategories();
        renderItems();
      }
    });
  }
});

function updateTokenUI() {
  if (DOM.tokenDisplay) DOM.tokenDisplay.textContent = `Token #${state.token}`;
  if (DOM.modalToken) DOM.modalToken.textContent = `Token #${state.token}`;
}

function handleSearch() {
  state.searchQuery = document.getElementById('searchInput').value.toLowerCase().trim();
  renderItems();
}

function renderCategories() {
  if (!DOM.catBar) return;
  const cats = ['All', ...new Set(state.menu.map(i => i.cat))];
  DOM.catBar.innerHTML = cats.map(c => 
    `<button class="cat-btn ${c === state.activeCat ? 'active' : ''}" onclick="filterCat('${c}')">${c}</button>`
  ).join('');
}

function filterCat(cat) {
  state.activeCat = cat;
  renderCategories();
  renderItems();
}

function renderItems() {
  if (!DOM.itemGrid) return;
  
  let list = state.activeCat === 'All' ? state.menu : state.menu.filter(i => i.cat === state.activeCat);

  if (state.searchQuery) {
    list = list.filter(i => i.name.toLowerCase().includes(state.searchQuery));
  }

  DOM.itemGrid.innerHTML = list.map(i => {
    const inCart = state.cart.get(String(i.id));
    const qty = inCart ? inCart.qty : 0;

    return `
      <div class="dish-card">
        <div class="dish-img-wrapper">
          <div class="veg-badge"></div>
          <img src="${i.img}" class="dish-img" alt="${i.name}">
        </div>
        <div class="dish-info">
          <div>
            <h4>${i.name}</h4>
            <p>₹${i.price}</p>
          </div>
          ${qty === 0 ? 
            `<button class="btn-add" onclick="addToCart('${i.id}')">ADD +</button>` : 
            `<div class="qty-select-wrapper">
              <span>Qty:</span>
              <select class="qty-dropdown" onchange="handleQtyChange('${i.id}', this.value)">
                <option value="0">0 (Remove)</option>
                <option value="1" ${qty === 1 ? 'selected' : ''}>1</option>
                <option value="2" ${qty === 2 ? 'selected' : ''}>2</option>
                <option value="3" ${qty === 3 ? 'selected' : ''}>3</option>
                <option value="4" ${qty === 4 ? 'selected' : ''}>4</option>
                <option value="5" ${qty === 5 ? 'selected' : ''}>5</option>
                <option value="6" ${qty === 6 ? 'selected' : ''}>6</option>
                <option value="7" ${qty === 7 ? 'selected' : ''}>7</option>
                <option value="8" ${qty === 8 ? 'selected' : ''}>8</option>
                <option value="9" ${qty === 9 ? 'selected' : ''}>9</option>
                <option value="custom" ${qty > 9 ? 'selected' : ''}>${qty > 9 ? qty : '9+ (Custom)'}</option>
              </select>
            </div>`
          }
        </div>
      </div>
    `;
  }).join('');
}

function addToCart(id) {
  const strId = String(id);
  const product = state.menu.find(i => String(i.id) === strId);
  if (product) {
    state.cart.set(strId, { ...product, qty: 1 });
  }
  renderItems();
  updateCartUI();
}

function handleQtyChange(id, value) {
  const strId = String(id);
  
  if (value === "custom") {
    const inputVal = prompt("Enter custom quantity:", state.cart.get(strId)?.qty || 10);
    const num = parseInt(inputVal, 10);
    
    if (!isNaN(num) && num > 0) {
      if (state.cart.has(strId)) {
        state.cart.get(strId).qty = num;
      }
    } else if (num === 0) {
      state.cart.delete(strId);
    }
  } else {
    const num = parseInt(value, 10);
    if (num <= 0) {
      state.cart.delete(strId);
    } else if (state.cart.has(strId)) {
      state.cart.get(strId).qty = num;
    }
  }

  renderItems();
  updateCartUI();
}

function clearCart() {
  state.cart.clear();
  renderItems();
  updateCartUI();
}

function updateCartUI() {
  let count = 0;
  let sum = 0;
  let html = '';

  state.cart.forEach((item, id) => {
    count += item.qty;
    const itemTotal = item.qty * item.price;
    sum += itemTotal;

    html += `
      <div class="cart-item">
        <div>
          <strong>${item.name}</strong><br>
          <small>₹${item.price} x ${item.qty} = ₹${itemTotal}</small>
        </div>
        <div class="qty-select-wrapper" style="width: 110px;">
          <select class="qty-dropdown" onchange="handleQtyChange('${id}', this.value)">
            <option value="0">0 (Remove)</option>
            <option value="1" ${item.qty === 1 ? 'selected' : ''}>1</option>
            <option value="2" ${item.qty === 2 ? 'selected' : ''}>2</option>
            <option value="3" ${item.qty === 3 ? 'selected' : ''}>3</option>
            <option value="4" ${item.qty === 4 ? 'selected' : ''}>4</option>
            <option value="5" ${item.qty === 5 ? 'selected' : ''}>5</option>
            <option value="6" ${item.qty === 6 ? 'selected' : ''}>6</option>
            <option value="7" ${item.qty === 7 ? 'selected' : ''}>7</option>
            <option value="8" ${item.qty === 8 ? 'selected' : ''}>8</option>
            <option value="9" ${item.qty === 9 ? 'selected' : ''}>9</option>
            <option value="custom" ${item.qty > 9 ? 'selected' : ''}>${item.qty > 9 ? item.qty : '9+'}</option>
          </select>
        </div>
      </div>
    `;
  });

  if (DOM.topCartQty) DOM.topCartQty.textContent = count;
  if (DOM.totalPayable) DOM.totalPayable.textContent = sum.toFixed(2);
  if (DOM.cartList) DOM.cartList.innerHTML = count === 0 ? '<div class="empty-state">Your order is empty. Add an item from the menu.</div>' : html;
}

function openCartModal() {
  document.getElementById('cartModal').classList.add('active');
}

function closeCartModal() {
  document.getElementById('cartModal').classList.remove('active');
}

// Helper to format text lines for 58mm thermal paper (32 characters wide)
function generateTextReceipt(token, cartMap, total, dateStr) {
  const LINE_WIDTH = 32;

  // Center align text
  const center = (text) => {
    if (text.length >= LINE_WIDTH) return text.substring(0, LINE_WIDTH);
    const space = Math.floor((LINE_WIDTH - text.length) / 2);
    return ' '.repeat(space) + text;
  };

  // Left and Right align text on a single line
  const justify = (left, right) => {
    const spaceNeeded = LINE_WIDTH - right.length;
    if (left.length > spaceNeeded) {
      left = left.substring(0, spaceNeeded - 1);
    }
    return left + ' '.repeat(spaceNeeded - left.length) + right;
  };

  const divider = '-'.repeat(LINE_WIDTH) + '\n';

  let txt = '';
  txt += center('VEG BITE') + '\n';
  txt += center('College Canteen') + '\n';
  txt += divider;
  txt += `TOKEN NO: ${token}\n`;
  txt += `Date: ${dateStr}\n`;
  txt += divider;

  cartMap.forEach((item) => {
    const itemTotal = `Rs.${(item.qty * item.price).toFixed(2)}`;
    // Line 1: Item Name
    txt += `${item.name}\n`;
    // Line 2: Qty x Price on left, Amount on right
    txt += justify(`  ${item.qty} x Rs.${item.price}`, itemTotal) + '\n';
  });

  txt += divider;
  txt += justify('TOTAL:', `Rs.${total.toFixed(2)}`) + '\n';
  txt += divider;
  txt += center('*** Thank You! Visit Again ***') + '\n\n\n';

  return txt;
}

// Generates formatted text for 58mm thermal printers (32 chars per line)
function generateTextReceipt(token, cartMap, total, dateStr) {
  const W = 32;
  const center = str => ' '.repeat(Math.max(0, Math.floor((W - str.length) / 2))) + str;
  const justify = (l, r) => l + ' '.repeat(Math.max(1, W - l.length - r.length)) + r;
  const divider = '-'.repeat(W) + '\n';

  let txt = 'VEG BITE\n';
  txt += 'College Canteen\n';
  txt += divider;
  txt += `TOKEN NO: ${token}\n`;
  txt += `Date: ${dateStr}\n`;
  txt += divider;

  cartMap.forEach((item) => {
    txt += `${item.name}\n`;
    txt += justify(`  ${item.qty} x Rs.${item.price}`, `Rs.${(item.qty * item.price).toFixed(2)}`) + '\n';
  });

  txt += divider;
  txt += justify('TOTAL:', `Rs.${total.toFixed(2)}`) + '\n';
  txt += divider;
  txt += center('*** Thank You! Visit Again ***') + '\n\n\n\n';

  return txt;
}

let printerDevice = null;
let printerCharacteristic = null;

// Connect directly to the thermal printer via Bluetooth GATT
async function getPrinterCharacteristic() {
  if (printerCharacteristic && printerDevice && printerDevice.gatt.connected) {
    return printerCharacteristic;
  }

  // Request Bluetooth connection with common thermal printer GATT services
  printerDevice = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [
      '000018f0-0000-1000-8000-00805f9b34fb',
      '00001101-0000-1000-8000-00805f9b34fb',
      '49535343-fe7d-4ae5-8fa9-9fafd205e455',
      'e7810a71-73ae-499d-8c15-faa9aef0c3f2'
    ]
  });

  const server = await printerDevice.gatt.connect();
  const services = await server.getPrimaryServices();

  for (const service of services) {
    const characteristics = await service.getCharacteristics();
    for (const char of characteristics) {
      if (char.properties.write || char.properties.writeWithoutResponse) {
        printerCharacteristic = char;
        return printerCharacteristic;
      }
    }
  }

  throw new Error("No writable printing service found on this Bluetooth device.");
}

// Generate raw 32-column text string using native ESC/POS ESC @ initialization
function generateRawAsciiReceipt(token, cartMap, total, dateStr) {
  const W = 32;
  const center = str => ' '.repeat(Math.max(0, Math.floor((W - str.length) / 2))) + str;
  const justify = (l, r) => l + ' '.repeat(Math.max(1, W - l.length - r.length)) + r;
  const divider = '-'.repeat(W) + '\n';

  let txt = '\x1b\x40'; // ESC @ : Reset/Initialize printer
  txt += center('VEG BITE') + '\n';
  txt += center('College Canteen') + '\n';
  txt += divider;
  txt += `TOKEN NO: ${token}\n`;
  txt += `Date: ${dateStr}\n`;
  txt += divider;

  cartMap.forEach((item) => {
    txt += `${item.name}\n`;
    txt += justify(`  ${item.qty} x Rs.${item.price}`, `Rs.${(item.qty * item.price).toFixed(2)}`) + '\n';
  });

  txt += divider;
  txt += justify('TOTAL:', `Rs.${total.toFixed(2)}`) + '\n';
  txt += divider;
  txt += center('*** Thank You! Visit Again ***') + '\n\n\n\n\n';

  return txt;
}

// Main printing handler triggered from the Cart Modal
async function processAndPrint() {
  if (state.cart.size === 0) return alert('Your cart is empty!');

  try {
    // 1. Establish direct Web Bluetooth GATT connection
    const char = await getPrinterCharacteristic();

    let sum = 0;
    const orderItems = [];
    state.cart.forEach(i => {
      sum += i.qty * i.price;
      orderItems.push({ name: i.name, price: i.price, qty: i.qty });
    });

    const dateStr = new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
    const rawText = generateRawAsciiReceipt(state.token, state.cart, sum, dateStr);

    // 2. Encode text payload to Uint8Array byte buffer
    const encoder = new TextEncoder();
    const data = encoder.encode(rawText);

    // 3. Send raw ESC/POS bytes over Bluetooth in small chunks (20 bytes per BLE packet)
    const CHUNK_SIZE = 20;
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      if (char.properties.writeWithoutResponse) {
        await char.writeValueWithoutResponse(chunk);
      } else {
        await char.writeValue(chunk);
      }
    }

    // 4. Save order to local storage and Firestore
    const orderRecord = { token: state.token, items: orderItems, total: sum, createdAt: new Date().toISOString() };
    const sales = JSON.parse(localStorage.getItem('vb_sales')) || [];
    sales.push(orderRecord);
    localStorage.setItem('vb_sales', JSON.stringify(sales));
    if (db) db.collection('orders').add(orderRecord);

    closeCartModal();

    // 5. Reset order counters and cart UI
    state.token++;
    localStorage.setItem('vb_token', state.token);
    state.cart.clear();
    updateTokenUI();
    renderItems();
    updateCartUI();

  } catch (err) {
    console.error("Web Bluetooth Print Error:", err);
    alert("Print Error: " + err.message);
  }
}
// History Modal Functions
function openHistoryModal() {
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('historyDateFilter');
  if (!dateInput.value) {
    dateInput.value = today;
  }
  renderHistory();
  document.getElementById('historyModal').classList.add('active');
}

function closeHistoryModal() {
  document.getElementById('historyModal').classList.remove('active');
}

function renderHistory() {
  const selectedDate = document.getElementById('historyDateFilter').value;
  const historyList = document.getElementById('historyList');
  const sales = JSON.parse(localStorage.getItem('vb_sales')) || [];

  // Filter orders matching the selected date
  const filteredSales = sales.filter(s => s.createdAt && s.createdAt.startsWith(selectedDate)).reverse();

  let dayTotal = 0;
  filteredSales.forEach(s => dayTotal += (s.total || 0));

  document.getElementById('historyDayRev').textContent = `₹${dayTotal.toFixed(2)}`;
  document.getElementById('historyDayCount').textContent = filteredSales.length;

  if (filteredSales.length === 0) {
    historyList.innerHTML = '<div class="empty-state">No orders recorded for this date.</div>';
    return;
  }

  historyList.innerHTML = filteredSales.map(order => {
    const timeStr = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const itemsHtml = (order.items || []).map(item => `
      <div class="history-item-row">
        <span>${item.name} (${item.qty} × ₹${item.price})</span>
        <strong>₹${(item.qty * item.price).toFixed(2)}</strong>
      </div>
    `).join('');

    return `
      <div class="history-card">
        <div class="history-card-header">
          <strong>Token #${order.token}</strong>
          <span style="color: var(--text-muted);">${timeStr}</span>
        </div>
        <div>${itemsHtml}</div>
        <div class="history-card-footer">
          <span>Total Amount</span>
          <span style="color: var(--rust-btn);">₹${Number(order.total).toFixed(2)}</span>
        </div>
      </div>
    `;
  }).join('');
}