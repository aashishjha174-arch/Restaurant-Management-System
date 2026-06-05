// Main client script for The Secret Garden by Phat Kath

const API_BASE = 'https://restaurant-management-system-r5mg.onrender.com';

// Global notification system
function showToast(message, type = 'success') {
  let toastContainer = document.getElementById('toast-notification');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-notification';
    toastContainer.className = 'toast';
    document.body.appendChild(toastContainer);
  }

  toastContainer.classList.remove('toast-success', 'toast-error');
  toastContainer.classList.add(`toast-${type}`);
  
  toastContainer.innerHTML = `
    <span>${type === 'success' ? '✓' : '✗'}</span>
    <div>${message}</div>
  `;
  
  toastContainer.classList.add('active');
  
  setTimeout(() => {
    toastContainer.classList.remove('active');
  }, 4000);
}

// 1. Fetch & Apply Dynamic Restaurant Settings
async function loadRestaurantSettings() {
  try {
    const response = await fetch(`${API_BASE}/api/settings`);
    const settings = await response.json();
    if (!settings) return;

    const addressElements = document.querySelectorAll('.settings-address');
    const phoneElements = document.querySelectorAll('.settings-phone');
    const hoursElements = document.querySelectorAll('.settings-hours');
    const facebookElements = document.querySelectorAll('.settings-facebook');
    const instagramElements = document.querySelectorAll('.settings-instagram');

    addressElements.forEach(el => el.textContent = settings.address);
    phoneElements.forEach(el => {
      el.textContent = settings.phone;
      if (el.tagName === 'A') {
        el.href = `tel:${settings.phone.replace(/[^0-9+]/g, '')}`;
      }
    });
    hoursElements.forEach(el => el.textContent = settings.openingHours);
    
    facebookElements.forEach(el => {
      if (el.tagName === 'A') el.href = settings.facebook;
      else el.textContent = settings.facebook;
    });

    instagramElements.forEach(el => {
      if (el.tagName === 'A') el.href = settings.instagram;
      else el.textContent = settings.instagram;
    });
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// 2. Mobile Navbar Menu Toggle & Header Scroll
function initNavigation() {
  const header = document.querySelector('header');
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  const navList = document.querySelector('nav ul');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  if (mobileMenuBtn && navList) {
    mobileMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navList.classList.toggle('active');
      mobileMenuBtn.innerHTML = navList.classList.contains('active') ? '✕' : '☰';
    });

    document.querySelectorAll('nav ul li a').forEach(link => {
      link.addEventListener('click', () => {
        navList.classList.remove('active');
        mobileMenuBtn.innerHTML = '☰';
      });
    });

    document.addEventListener('click', (e) => {
      if (!navList.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
        navList.classList.remove('active');
        mobileMenuBtn.innerHTML = '☰';
      }
    });
  }
}

// 3. GSAP Scroll Animations Initialization
function initScrollAnimations() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    const animatedElements = document.querySelectorAll('.animate-on-scroll, .feature-card, .menu-card');
    animatedElements.forEach(el => el.style.opacity = 1);
    
    const heroH1 = document.querySelector('.hero-content h1');
    const heroTag = document.querySelector('.hero-content .tagline');
    const heroDesc = document.querySelector('.hero-content .desc');
    const heroBtns = document.querySelector('.hero-content .hero-btns');
    if (heroH1) heroH1.style.opacity = 1;
    if (heroTag) heroTag.style.opacity = 1;
    if (heroDesc) heroDesc.style.opacity = 1;
    if (heroBtns) heroBtns.style.opacity = 1;
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  const heroTL = gsap.timeline({ defaults: { ease: 'power3.out', duration: 1 } });
  heroTL.to('.hero-content h1', { opacity: 1, y: 0, delay: 0.3 })
        .to('.hero-content .tagline', { opacity: 1, y: 0 }, '-=0.7')
        .to('.hero-content .desc', { opacity: 1, y: 0 }, '-=0.7')
        .to('.hero-content .hero-btns', { opacity: 1, y: 0 }, '-=0.7');

  const fadeUpElements = document.querySelectorAll('.animate-on-scroll');
  fadeUpElements.forEach(el => {
    gsap.fromTo(el, 
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 1.2,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none'
        }
      }
    );
  });

  if (document.querySelector('.feature-card')) {
    gsap.fromTo('.feature-card', 
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        stagger: 0.2,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.features-grid',
          start: 'top 85%'
        }
      }
    );
  }
}

// 4. Menu Rendering & Filter logic
async function initMenuPage() {
  const menuContainer = document.getElementById('menu-items-grid');
  if (!menuContainer) return;

  try {
    const response = await fetch(`${API_BASE}/api/menu`);
    const items = await response.json();
    if (!items || items.length === 0) {
      menuContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;">No menu items found. Please check back later!</div>';
      return;
    }

    renderMenuItems(items);

    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const category = btn.dataset.category;
        if (category === 'all') {
          renderMenuItems(items);
        } else {
          const filtered = items.filter(item => item.category.toLowerCase() === category.toLowerCase());
          renderMenuItems(filtered);
        }
      });
    });
  } catch (error) {
    console.error('Error loading menu:', error);
    menuContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: red;">Failed to load menu. Please refresh the page.</div>';
  }
}

function renderMenuItems(items) {
  const menuContainer = document.getElementById('menu-items-grid');
  menuContainer.innerHTML = '';

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = `menu-card animate-on-scroll ${item.available ? '' : 'unavailable-item'}`;
    
    let imageHTML = '';
    if (item.image) {
      imageHTML = `<img src="${item.image}" alt="${item.name}" loading="lazy">`;
    } else {
      const initials = item.name.split(' ').map(n => n[0]).join('').slice(0, 2);
      imageHTML = `<div class="menu-placeholder-img">${initials}</div>`;
    }

    card.innerHTML = `
      <div class="menu-image-container">
        ${imageHTML}
        ${item.category ? `<span class="menu-badge">${item.category}</span>` : ''}
      </div>
      <div class="menu-info">
        <div class="menu-title-row">
          <h3>${item.name}</h3>
          <span class="menu-price">Rs ${item.price}</span>
        </div>
        <p class="menu-desc">${item.description || 'No description available.'}</p>
        <div class="menu-status ${item.available ? 'available' : 'unavailable'}">
          ${item.available ? '' : 'Unavailable Today'}
        </div>
      </div>
    `;
    menuContainer.appendChild(card);
  });
}

// 5. Gallery Rendering and Lightbox
async function initGalleryPage() {
  const galleryGrid = document.getElementById('gallery-items-grid');
  if (!galleryGrid) return;

  const lightbox = document.getElementById('gallery-lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCap = document.getElementById('lightbox-caption');
  const lightboxClose = document.getElementById('lightbox-close');

  try {
    const response = await fetch(`${API_BASE}/api/gallery`);
    const images = await response.json();
    if (!images || images.length === 0) {
      galleryGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;">No photos available in gallery yet.</div>';
      return;
    }

    galleryGrid.innerHTML = '';
    images.forEach(img => {
      const item = document.createElement('div');
      item.className = 'gallery-item';
      item.innerHTML = `
        <img src="${img.url}" alt="${img.caption || 'The Secret Garden'}" loading="lazy">
        ${img.caption ? `<div class="gallery-caption">${img.caption}</div>` : ''}
      `;
      
      item.addEventListener('click', () => {
        lightboxImg.src = img.url;
        lightboxCap.textContent = img.caption || 'The Secret Garden';
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
      });

      galleryGrid.appendChild(item);
    });

    if (lightboxClose && lightbox) {
      const closeLightbox = () => {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
      };
      
      lightboxClose.addEventListener('click', closeLightbox);
      lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox || e.target === lightboxClose) {
          closeLightbox();
        }
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeLightbox();
      });
    }
  } catch (error) {
    console.error('Gallery loading failed:', error);
  }
}

// 6. Reviews Page Rendering & Reviews Submission
async function initReviewsPage() {
  const reviewsList = document.getElementById('reviews-list-container');
  if (!reviewsList) return;

  const form = document.getElementById('submit-review-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('review-name').value;
      const text = document.getElementById('review-text').value;
      const rating = document.querySelector('input[name="rating"]:checked')?.value;

      if (!rating) {
        showToast('Please select a star rating.', 'error');
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/reviews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, rating, text })
        });
        const resData = await response.json();
        
        if (resData.success) {
          showToast(resData.message, 'success');
          form.reset();
        } else {
          showToast(resData.message || 'Submission failed.', 'error');
        }
      } catch (err) {
        console.error('Error submitting review:', err);
        showToast('Failed to submit review. Connection error.', 'error');
      }
    });
  }

  loadApprovedReviews();
}

async function loadApprovedReviews() {
  const reviewsList = document.getElementById('reviews-list-container');
  const avgNum = document.getElementById('avg-rating-value');
  const totalCount = document.getElementById('total-reviews-count');
  const avgStars = document.getElementById('avg-stars-display');

  if (!reviewsList) return;

  try {
    const response = await fetch(`${API_BASE}/api/reviews`);
    const data = await response.json();
    
    if (avgNum) avgNum.textContent = data.averageRating || '0.0';
    if (totalCount) totalCount.textContent = `${data.totalReviews || 0} reviews`;
    
    if (avgStars) {
      avgStars.innerHTML = getStarsHTML(Math.round(data.averageRating || 0));
    }

    const breakdown = data.ratingBreakdown || {};
    const total = data.totalReviews || 1;
    for (let stars = 1; stars <= 5; stars++) {
      const fillBar = document.getElementById(`bar-fill-${stars}`);
      const countLabel = document.getElementById(`bar-count-${stars}`);
      const count = breakdown[stars] || 0;
      const percentage = (count / total) * 100;
      
      if (fillBar) fillBar.style.width = `${percentage}%`;
      if (countLabel) countLabel.textContent = count;
    }

    if (!data.reviews || data.reviews.length === 0) {
      reviewsList.innerHTML = '<div style="text-align: center; padding: 30px; background: white; border-radius: 8px;">No approved reviews yet. Be the first to review us!</div>';
      return;
    }

    reviewsList.innerHTML = '';
    data.reviews.forEach(review => {
      const date = new Date(review.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const card = document.createElement('div');
      card.className = 'review-card';
      card.innerHTML = `
        <div class="review-header">
          <div class="review-author">${review.name}</div>
          <div class="review-date">${date}</div>
        </div>
        <div class="review-stars">${getStarsHTML(review.rating)}</div>
        <div class="review-text">"${review.text}"</div>
      `;
      reviewsList.appendChild(card);
    });
  } catch (err) {
    console.error('Failed to load reviews:', err);
  }
}

// Helpers for star HTML creation
function getStarsHTML(rating) {
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    stars += i <= rating ? '★' : '☆';
  }
  return stars;
}

// 7. Contact Form Simulation
function initContactPage() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('contact-name').value;
    const email = document.getElementById('contact-email').value;
    const message = document.getElementById('contact-message').value;

    if (!name || !email || !message) {
      showToast('Please fill out all fields.', 'error');
      return;
    }

    showToast(`Thank you ${name}! Your message was successfully received.`, 'success');
    form.reset();
  });
}

// DOM Setup Routing Initializations
document.addEventListener('DOMContentLoaded', () => {
  loadRestaurantSettings();
  initNavigation();
  initScrollAnimations();
  
  initMenuPage();
  initGalleryPage();
  initReviewsPage();
  initContactPage();
});
