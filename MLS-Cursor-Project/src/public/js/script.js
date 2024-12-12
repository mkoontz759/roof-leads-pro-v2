function toggleMenu() {
  const sideMenu = document.querySelector('.side-menu');
  const mainContent = document.querySelector('.main-content');
  const menuToggle = document.querySelector('.menu-toggle');

  sideMenu.classList.toggle('collapsed');
  mainContent.classList.toggle('menu-collapsed');
  menuToggle.classList.toggle('collapsed');
} 