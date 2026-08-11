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

let salesChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  renderTable();
  loadStats();
  updateChart();

  // Compress image on file upload
  document.getElementById('pImage').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 180;
        canvas.height = 180;
        ctx.drawImage(img, 0, 0, 180, 180);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);
        document.getElementById('pImgBase64').value = compressedBase64;
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });

  // Handle Add / Edit submit
  document.getElementById('menuForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('pId').value;
    const name = document.getElementById('pName').value.trim();
    const price = parseFloat(document.getElementById('pPrice').value);
    const cat = document.getElementById('pCat').value.trim();
    const img = document.getElementById('pImgBase64').value;

    let menu = JSON.parse(localStorage.getItem('vb_menu')) || [];

    if (id) {
      // Edit existing dish
      const idx = menu.findIndex(i => String(i.id) === String(id));
      if (idx > -1) {
        menu[idx].name = name;
        menu[idx].price = price;
        menu[idx].cat = cat;
        if (img) menu[idx].img = img;

        if (db) {
          try {
            await db.collection('menu').doc(String(id)).update(menu[idx]);
          } catch (err) {
            console.error("Firestore update failed: ", err);
            alert("Firebase write error! Check Firestore Rules in Firebase console.");
          }
        }
      }
    } else {
      // Add new dish
      if (!img) {
        alert("Please select an image for the dish.");
        return;
      }
      const newItem = { id: String(Date.now()), name, price, cat, img };
      menu.push(newItem);

      if (db) {
        try {
          await db.collection('menu').doc(newItem.id).set(newItem);
        } catch (err) {
          console.error("Firestore set failed: ", err);
          alert("Firebase write error! Check Firestore Rules in Firebase console.");
        }
      }
    }

    localStorage.setItem('vb_menu', JSON.stringify(menu));
    resetForm();
    renderTable();
  });
});

function renderTable() {
  const menu = JSON.parse(localStorage.getItem('vb_menu')) || [];
  const query = (document.getElementById('adminSearchInput')?.value || '').toLowerCase().trim();
  const tbody = document.querySelector('#menuTable tbody');

  const filteredMenu = query ? menu.filter(i => i.name.toLowerCase().includes(query) || i.cat.toLowerCase().includes(query)) : menu;

  tbody.innerHTML = filteredMenu.map(i => `
    <tr>
      <td><img src="${i.img}" class="table-img" alt=""></td>
      <td><strong>${i.name}</strong><br><small style="color:#787d74;">${i.cat}</small></td>
      <td>₹${i.price}</td>
      <td>
        <button class="btn-clear" style="padding: 4px 8px; font-size: 0.75rem;" onclick="editItem('${i.id}')">Edit</button>
        <button class="btn-danger" style="padding: 4px 8px; font-size: 0.75rem;" onclick="deleteItem('${i.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

function editItem(id) {
  const menu = JSON.parse(localStorage.getItem('vb_menu')) || [];
  const item = menu.find(i => String(i.id) === String(id));
  if (!item) return;

  document.getElementById('pId').value = item.id;
  document.getElementById('pName').value = item.name;
  document.getElementById('pPrice').value = item.price;
  document.getElementById('pCat').value = item.cat;
  document.getElementById('pImgBase64').value = item.img;

  document.getElementById('formTitle').textContent = "Edit Dish Item";
  document.getElementById('saveBtn').textContent = "Update Dish";
  document.getElementById('cancelEditBtn').style.display = "block";

  window.scrollTo({ top: 300, behavior: 'smooth' });
}

function resetForm() {
  document.getElementById('menuForm').reset();
  document.getElementById('pId').value = '';
  document.getElementById('pImgBase64').value = '';
  document.getElementById('formTitle').textContent = "Add New Item";
  document.getElementById('saveBtn').textContent = "Save Dish";
  document.getElementById('cancelEditBtn').style.display = "none";
}

function deleteItem(id) {
  if (!confirm("Are you sure you want to delete this dish?")) return;
  let menu = JSON.parse(localStorage.getItem('vb_menu')) || [];
  menu = menu.filter(i => String(i.id) !== String(id));
  localStorage.setItem('vb_menu', JSON.stringify(menu));
  if (db) db.collection('menu').doc(String(id)).delete();
  renderTable();
}

function loadStats() {
  const sales = JSON.parse(localStorage.getItem('vb_sales')) || [];
  const today = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter(s => s.createdAt && s.createdAt.startsWith(today));

  const totalRev = todaySales.reduce((acc, s) => acc + s.total, 0);

  document.getElementById('revStat').textContent = `₹${totalRev}`;
  document.getElementById('orderStat').textContent = todaySales.length;
}

function resetDaySales() {
  if (confirm('Are you sure you want to reset today\'s counters?')) {
    const sales = JSON.parse(localStorage.getItem('vb_sales')) || [];
    const today = new Date().toISOString().split('T')[0];
    const filteredSales = sales.filter(s => !s.createdAt.startsWith(today));
    
    localStorage.setItem('vb_sales', JSON.stringify(filteredSales));
    localStorage.setItem('vb_token', 1);
    
    loadStats();
    updateChart();
  }
}

function updateChart() {
  const filter = document.getElementById('chartFilter').value;
  const sales = JSON.parse(localStorage.getItem('vb_sales')) || [];
  const now = new Date();

  let labels = [];
  let dataMap = {};

  if (filter === 'daily') {
    labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    labels.forEach(l => dataMap[l] = 0);

    sales.forEach(sale => {
      if (!sale.createdAt) return;
      const d = new Date(sale.createdAt);
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        if (dataMap[dayName] !== undefined) {
          dataMap[dayName] += sale.total;
        }
      }
    });

  } else if (filter === 'weekly') {
    labels = ['Week 1 (1-7)', 'Week 2 (8-14)', 'Week 3 (15-21)', 'Week 4 (22+)'];
    labels.forEach(l => dataMap[l] = 0);

    sales.forEach(sale => {
      if (!sale.createdAt) return;
      const d = new Date(sale.createdAt);
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        const dateNum = d.getDate();
        if (dateNum <= 7) dataMap['Week 1 (1-7)'] += sale.total;
        else if (dateNum <= 14) dataMap['Week 2 (8-14)'] += sale.total;
        else if (dateNum <= 21) dataMap['Week 3 (15-21)'] += sale.total;
        else dataMap['Week 4 (22+)'] += sale.total;
      }
    });

  } else if (filter === 'monthly') {
    labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    labels.forEach(l => dataMap[l] = 0);

    sales.forEach(sale => {
      if (!sale.createdAt) return;
      const d = new Date(sale.createdAt);
      if (d.getFullYear() === now.getFullYear()) {
        const monthName = d.toLocaleDateString('en-US', { month: 'short' });
        if (dataMap[monthName] !== undefined) {
          dataMap[monthName] += sale.total;
        }
      }
    });
  }

  const chartValues = labels.map(label => dataMap[label]);

  if (salesChartInstance) {
    salesChartInstance.destroy();
  }

  const ctx = document.getElementById('salesChart').getContext('2d');
  salesChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Revenue (₹)',
        data: chartValues,
        backgroundColor: '#d34828',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { 
          beginAtZero: true,
          ticks: {
            callback: function(value) { return '₹' + value; }
          }
        }
      }
    }
  });
}