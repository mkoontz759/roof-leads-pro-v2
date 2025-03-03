function toggleMenu() {
  const sideMenu = document.querySelector('.side-menu');
  const mainContent = document.querySelector('.main-content');
  const menuToggle = document.querySelector('.menu-toggle');

  sideMenu.classList.toggle('collapsed');
  mainContent.classList.toggle('menu-collapsed');
  menuToggle.classList.toggle('collapsed');
}

function formatCentralTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
  }) + ' at ' + 
  date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
  });
}

let searchTimeout;

function debounceSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
      search();
  }, 300);
}

function search() {
  const query = document.getElementById('searchInput').value;
  const dateRange = document.getElementById('dateRange').value;
  const currentUrl = new URL(window.location.href);
  const searchParams = new URLSearchParams(currentUrl.search);

  if (query) {
      searchParams.set('query', query);
  } else {
      searchParams.delete('query');
  }

  searchParams.set('dateRange', dateRange);
  searchParams.set('page', '1');

  window.location.href = `${currentUrl.pathname}?${searchParams.toString()}`;
}

function sortTable(field) {
  const currentUrl = new URL(window.location.href);
  const currentSort = currentUrl.searchParams.get('sortField');
  const currentOrder = currentUrl.searchParams.get('sortOrder');

  let newOrder = 'asc';
  if (field === currentSort && currentOrder === 'asc') {
      newOrder = 'desc';
  }

  currentUrl.searchParams.set('sortField', field);
  currentUrl.searchParams.set('sortOrder', newOrder);
  window.location.href = currentUrl.toString();
}

function changePage(newLimit) {
  const currentUrl = new URL(window.location.href);
  currentUrl.searchParams.set('limit', newLimit);
  currentUrl.searchParams.set('page', '1');
  window.location.href = currentUrl.toString();
}

// Add event listeners when the document loads
document.addEventListener('DOMContentLoaded', function() {
  // Search input listener
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
      searchInput.addEventListener('input', debounceSearch);
  }

  // Date range listener
  const dateRange = document.getElementById('dateRange');
  if (dateRange) {
      dateRange.addEventListener('change', search);
  }

  // Menu item click handlers
  document.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
          const sideMenu = document.getElementById('sideMenu');
          if (sideMenu.classList.contains('collapsed')) {
              e.preventDefault();
              toggleMenu();
          }
      });
  });
}); 