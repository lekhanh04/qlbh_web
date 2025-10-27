const API = '/api/products';

const fmtVND = n => new Intl.NumberFormat('vi-VN').format(Number(n));

// Biến lưu trữ tất cả sản phẩm
let allProducts = [];
let filteredProducts = [];

// Load tất cả sản phẩm
async function loadAllProducts() {
  try {
    const res = await fetch(API);
    allProducts = await res.json();
    filteredProducts = [...allProducts];
    renderProducts();
    updateSearchResults();
  } catch (err) {
    console.error('Error loading products:', err);
  }
}

// Render sản phẩm đã lọc
function renderProducts() {
  const tbody = document.querySelector('#productsTable tbody');
  tbody.innerHTML = '';
  
  filteredProducts.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.name}</td>
      <td>${fmtVND(p.price)}</td>
      <td>${p.stock}</td>
      <td>
        <button data-id="${p.id}" class="add-stock">Nhập thêm</button>
        <button data-id="${p.id}" class="delete">Xóa</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

// Cập nhật kết quả tìm kiếm
function updateSearchResults() {
  const searchResults = document.getElementById('searchResults');
  const searchInput = document.getElementById('searchInput');
  const stockFilter = document.getElementById('stockFilter');
  
  const searchTerm = searchInput.value.toLowerCase();
  const stockFilterValue = stockFilter.value;
  
  let filtered = allProducts;
  
  // Lọc theo tên
  if (searchTerm) {
    filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm));
  }
  
  // Lọc theo tồn kho
  if (stockFilterValue) {
    filtered = filtered.filter(p => {
      const stock = p.stock;
      switch (stockFilterValue) {
        case '0': return stock === 0;
        case '1-10': return stock >= 1 && stock <= 10;
        case '11-50': return stock >= 11 && stock <= 50;
        case '51+': return stock >= 51;
        default: return true;
      }
    });
  }
  
  // Sắp xếp
  const sortBy = document.getElementById('sortBy').value;
  filtered.sort((a, b) => {
    switch (sortBy) {
      case 'id-desc': return b.id - a.id;
      case 'id-asc': return a.id - b.id;
      case 'name-asc': return a.name.localeCompare(b.name);
      case 'name-desc': return b.name.localeCompare(a.name);
      case 'price-asc': return a.price - b.price;
      case 'price-desc': return b.price - a.price;
      case 'stock-asc': return a.stock - b.stock;
      case 'stock-desc': return b.stock - a.stock;
      default: return b.id - a.id;
    }
  });
  
  filteredProducts = filtered;
  renderProducts();
  
  // Hiển thị kết quả
  const total = allProducts.length;
  const found = filtered.length;
  
  if (searchTerm || stockFilterValue) {
    searchResults.innerHTML = `Tìm thấy ${found}/${total} sản phẩm`;
  } else {
    searchResults.innerHTML = `Tổng cộng ${total} sản phẩm`;
  }
}

// Event listeners cho tìm kiếm và lọc
document.addEventListener('DOMContentLoaded', () => {
  loadAllProducts();
  
  // Tìm kiếm theo tên
  document.getElementById('searchInput').addEventListener('input', updateSearchResults);
  
  // Lọc theo tồn kho
  document.getElementById('stockFilter').addEventListener('change', updateSearchResults);
  
  // Sắp xếp
  document.getElementById('sortBy').addEventListener('change', updateSearchResults);
  
  // Xóa bộ lọc
  document.getElementById('clearFilters').addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    document.getElementById('stockFilter').value = '';
    document.getElementById('sortBy').value = 'id-desc';
    updateSearchResults();
  });
});

document.addEventListener('click', async (e) => {
  if (e.target.classList.contains('add-stock')) {
    const id = e.target.getAttribute('data-id');
    const amountStr = prompt('Nhập số lượng cần thêm:', '1');
    if (amountStr === null) return;
    const amount = Number(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) return alert('Số lượng phải > 0');
    const r = await fetch(`${API}/${id}/add-stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount })
    });
    if (!r.ok) {
      try { const j = await r.json(); alert(j.message || 'Lỗi'); } catch(_) { alert('Lỗi'); }
    }
    loadAllProducts(); // Reload tất cả sản phẩm
    return;
  }
  if (e.target.classList.contains('delete')) {
    const id = e.target.getAttribute('data-id');
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    loadAllProducts(); // Reload tất cả sản phẩm
  }
});

document.getElementById('createForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const payload = {
    name: form.name.value,
    price: Number(form.price.value),
    stock: Number(form.stock.value)
  };
  await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  form.reset();
  loadAllProducts(); // Reload tất cả sản phẩm
});

// Xử lý import Excel
document.getElementById('importForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const fileInput = document.getElementById('excelFile');
  const resultDiv = document.getElementById('importResult');
  
  if (!fileInput.files[0]) {
    resultDiv.innerHTML = '<div style="color: red;">Vui lòng chọn file Excel</div>';
    return;
  }

  const formData = new FormData();
  formData.append('excelFile', fileInput.files[0]);

  try {
    resultDiv.innerHTML = '<div style="color: blue;">Đang xử lý file...</div>';
    
    const response = await fetch(`${API}/import-excel`, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    
    if (response.ok) {
      resultDiv.innerHTML = `
        <div style="color: green;">
          <strong>${result.message}</strong>
          ${result.errors ? `<br><small style="color: orange;">Cảnh báo: ${result.errors.join(', ')}</small>` : ''}
        </div>
      `;
      form.reset();
      loadAllProducts(); // Reload tất cả sản phẩm
    } else {
      resultDiv.innerHTML = `<div style="color: red;">${result.message}</div>`;
    }
  } catch (error) {
    resultDiv.innerHTML = `<div style="color: red;">Lỗi: ${error.message}</div>`;
  }
});

// Cập nhật hàm loadProducts cũ để tương thích
async function loadProducts() {
  await loadAllProducts();
}