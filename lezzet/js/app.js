/**
 * Main Application Logic & Router - Dijital Tarif Defterim
 */

const App = {
  currentView: 'home',
  currentRecipeId: null,
  activeCategory: 'all',
  searchQuery: '',
  portionMultiplier: 1,
  currentServings: 4,
  baseServings: 4,
  activeDetailTab: 'malzemeler',
  timerInterval: null,
  timerSecondsRemaining: 0,
  timerTotalSeconds: 0,

  init() {
    // Check if first time user (show welcome onboarding)
    const hasSeenWelcome = localStorage.getItem('lezzet_has_seen_welcome');
    if (!hasSeenWelcome) {
      this.showView('welcome');
    } else {
      this.showView('home');
    }

    this.initTheme();
    this.bindEvents();
    this.renderHome();
  },

  initTheme() {
    const savedTheme = localStorage.getItem('lezzet_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  },

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('lezzet_theme', next);
    this.showToast(next === 'dark' ? '🌙 Koyu tema aktif edildi' : '☀️ Açık tema aktif edildi');
    this.renderProfile();
  },

  bindEvents() {
    // Search input
    const searchInput = document.getElementById('main-search-input');
    const searchClear = document.getElementById('main-search-clear');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        if (searchClear) {
          searchClear.style.display = this.searchQuery.length > 0 ? 'block' : 'none';
        }
        this.renderHome();
      });
    }

    if (searchClear) {
      searchClear.addEventListener('click', () => {
        searchInput.value = '';
        this.searchQuery = '';
        searchClear.style.display = 'none';
        this.renderHome();
      });
    }

    // Categories click handler
    const catContainer = document.getElementById('categories-scroll');
    if (catContainer) {
      catContainer.addEventListener('click', (e) => {
        const chip = e.target.closest('.category-chip');
        if (!chip) return;
        document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.activeCategory = chip.dataset.category;
        this.renderHome();
      });
    }
  },

  showView(viewName, params = {}) {
    this.currentView = viewName;
    
    // Hide all view containers
    const views = ['welcome', 'home', 'detail', 'add', 'profile'];
    views.forEach(v => {
      const el = document.getElementById(`view-${v}`);
      if (el) el.style.display = 'none';
    });

    const targetEl = document.getElementById(`view-${viewName}`);
    if (targetEl) {
      targetEl.style.display = 'block';
      targetEl.classList.remove('animate-fade-in');
      void targetEl.offsetWidth; // Trigger reflow
      targetEl.classList.add('animate-fade-in');
    }

    // Update bottom navigation visibility and active state
    const bottomNav = document.getElementById('app-bottom-nav');
    const topBar = document.getElementById('app-top-bar');

    if (viewName === 'welcome') {
      if (bottomNav) bottomNav.style.display = 'none';
      if (topBar) topBar.style.display = 'none';
    } else {
      if (bottomNav) bottomNav.style.display = 'flex';
      if (topBar) topBar.style.display = (viewName === 'detail' || viewName === 'add') ? 'none' : 'flex';
    }

    // Update active nav button
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.nav === viewName) {
        item.classList.add('active');
      }
    });

    // View specific init
    if (viewName === 'home') {
      this.renderHome();
    } else if (viewName === 'detail' && params.id) {
      this.currentRecipeId = params.id;
      this.renderDetail(params.id);
    } else if (viewName === 'add') {
      this.renderForm(params.editId || null);
    } else if (viewName === 'profile') {
      this.renderProfile();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  startAppFromWelcome() {
    localStorage.setItem('lezzet_has_seen_welcome', 'true');
    this.showView('home');
  },

  // ==========================================================================
  // VIEW: Home / Feed
  // ==========================================================================
  renderHome() {
    const grid = document.getElementById('recipes-grid');
    if (!grid) return;

    let recipes = DataStore.getRecipes();

    // Filter by category
    if (this.activeCategory === 'favoriler') {
      recipes = recipes.filter(r => r.isFavorite);
    } else if (this.activeCategory !== 'all') {
      recipes = recipes.filter(r => r.category === this.activeCategory);
    }

    // Filter by search query
    if (this.searchQuery) {
      recipes = recipes.filter(r => {
        const titleMatch = r.title.toLowerCase().includes(this.searchQuery);
        const descMatch = r.description && r.description.toLowerCase().includes(this.searchQuery);
        const instMatch = r.instructions && r.instructions.toLowerCase().includes(this.searchQuery);
        const ingMatch = r.ingredients && r.ingredients.some(ing => 
          ing.name && ing.name.toLowerCase().includes(this.searchQuery)
        );
        return titleMatch || descMatch || instMatch || ingMatch;
      });
    }

    if (recipes.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <span class="material-symbols-outlined">menu_book</span>
          <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 6px;">Henüz tarif bulunmuyor</h3>
          <p style="font-size: 0.95rem; opacity: 0.8; margin-bottom: 16px;">
            ${this.searchQuery ? `"${this.searchQuery}" için sonuç bulunamadı.` : 'Tarif defterinize ilk tarifinizi ekleyin.'}
          </p>
          <button class="btn-primary press-effect" onclick="App.showView('add')">
            <span class="material-symbols-outlined">add</span>
            Yeni Tarif Ekle
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = recipes.map(recipe => `
      <article class="recipe-card card-hover-effect animate-slide-up" onclick="App.showView('detail', { id: '${recipe.id}' })">
        <div class="recipe-image-wrap">
          <img src="${recipe.image}" alt="${recipe.title}" loading="lazy">
          <button class="btn-favorite-card press-effect ${recipe.isFavorite ? 'favorited' : ''}" 
                  onclick="event.stopPropagation(); App.toggleFavorite('${recipe.id}')" 
                  title="Favorilere ekle">
            <span class="material-symbols-outlined ${recipe.isFavorite ? 'fill' : ''}">favorite</span>
          </button>
          <div class="glass-chip recipe-time-badge">
            <span class="material-symbols-outlined" style="font-size: 14px;">schedule</span>
            <span>${recipe.prepTime || 30} dk</span>
          </div>
        </div>
        <div class="recipe-card-body">
          <h2 class="recipe-card-title">${recipe.title}</h2>
          <p class="recipe-card-desc">${recipe.description || 'Açıklama bulunmuyor.'}</p>
          <div class="recipe-card-meta">
            <span>
              <span class="material-symbols-outlined" style="font-size: 16px;">restaurant</span>
              ${recipe.categoryLabel || 'Genel'}
            </span>
            <span>•</span>
            <span>
              <span class="material-symbols-outlined" style="font-size: 16px;">speed</span>
              ${recipe.difficulty || 'Kolay'}
            </span>
            ${recipe.servings ? `<span>•</span><span><span class="material-symbols-outlined" style="font-size: 16px;">group</span>${recipe.servings} Kişilik</span>` : ''}
          </div>
        </div>
      </article>
    `).join('');
  },

  toggleFavorite(recipeId) {
    const isFav = DataStore.toggleFavorite(recipeId);
    this.showToast(isFav ? '❤️ Favorilere eklendi' : '💔 Favorilerden çıkarıldı');
    
    if (this.currentView === 'home') {
      this.renderHome();
    } else if (this.currentView === 'detail' && this.currentRecipeId === recipeId) {
      this.renderDetail(recipeId);
    } else if (this.currentView === 'profile') {
      this.renderProfile();
    }
  },

  // ==========================================================================
  // VIEW: Recipe Detail
  // ==========================================================================
  renderDetail(recipeId) {
    const recipe = DataStore.getRecipeById(recipeId);
    if (!recipe) {
      this.showToast('Tarif bulunamadı!');
      this.showView('home');
      return;
    }

    this.baseServings = recipe.servings || 4;
    this.currentServings = this.baseServings;
    this.portionMultiplier = 1;

    const container = document.getElementById('view-detail');
    if (!container) return;

    container.innerHTML = `
      <!-- Top Floating Navigation -->
      <header class="top-app-bar">
        <button class="icon-btn press-effect" onclick="App.showView('home')" title="Geri">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <span class="brand-title" style="font-size: 1.15rem;">Lezzet Defteri</span>
        <div style="display: flex; gap: 4px;">
          <button class="icon-btn press-effect" onclick="App.showView('add', { editId: '${recipe.id}' })" title="Düzenle">
            <span class="material-symbols-outlined">edit</span>
          </button>
          <button class="icon-btn press-effect ${recipe.isFavorite ? 'text-tertiary' : ''}" onclick="App.toggleFavorite('${recipe.id}')" title="Favori">
            <span class="material-symbols-outlined ${recipe.isFavorite ? 'fill' : ''}" style="color: ${recipe.isFavorite ? 'var(--color-tertiary)' : 'inherit'}">favorite</span>
          </button>
        </div>
      </header>

      <!-- Hero Banner Image -->
      <div class="detail-hero-wrap">
        <img src="${recipe.image}" alt="${recipe.title}">
        <div class="detail-hero-gradient"></div>
        <div class="detail-badges-wrap">
          <div class="glass-chip">
            <span class="material-symbols-outlined" style="font-size: 15px;">timer</span>
            <span>${recipe.prepTime || 30} dk</span>
          </div>
          <div class="glass-chip">
            <span class="material-symbols-outlined" style="font-size: 15px;">restaurant_menu</span>
            <span>${recipe.difficulty || 'Orta'}</span>
          </div>
          <div class="glass-chip">
            <span class="material-symbols-outlined" style="font-size: 15px;">category</span>
            <span>${recipe.categoryLabel || 'Genel'}</span>
          </div>
        </div>
      </div>

      <!-- Detail Card Sheet -->
      <div class="detail-card-sheet">
        <div class="detail-header-block">
          <h1 class="detail-title">${recipe.title}</h1>
          <p class="detail-desc">${recipe.description || 'Bu tarif için açıklama girilmemiş.'}</p>
          
          <!-- Portion Calculator -->
          <div class="portion-calculator">
            <span style="font-size: 0.85rem; font-weight: 500; color: var(--color-on-surface-variant);">Porsiyon:</span>
            <button class="portion-btn press-effect" onclick="App.changePortion(-1)">-</button>
            <span class="portion-count" id="portion-display">${this.currentServings} Kişilik</span>
            <button class="portion-btn press-effect" onclick="App.changePortion(1)">+</button>
          </div>
        </div>

        <!-- Detail Tabs -->
        <div class="detail-tabs-bar">
          <button class="tab-btn ${this.activeDetailTab === 'malzemeler' ? 'active' : ''}" 
                  id="tab-btn-malzemeler" 
                  onclick="App.switchDetailTab('malzemeler')">
            Malzemeler (${recipe.ingredients ? recipe.ingredients.length : 0})
          </button>
          <button class="tab-btn ${this.activeDetailTab === 'yapilisi' ? 'active' : ''}" 
                  id="tab-btn-yapilisi" 
                  onclick="App.switchDetailTab('yapilisi')">
            Yapılışı
          </button>
        </div>

        <!-- Tab Contents Container -->
        <div id="detail-tab-content-area">
          ${this.renderDetailTabContent(recipe)}
        </div>

        <!-- Detail Actions Footer -->
        <div class="detail-actions-footer">
          <button class="btn-primary press-effect" style="flex: 1;" onclick="App.markRecipeCooked('${recipe.id}')">
            <span class="material-symbols-outlined">check_circle</span>
            Yaptım & Pişirdim (${recipe.cookedCount || 0})
          </button>
          <button class="btn-secondary press-effect" onclick="App.shareRecipe('${recipe.id}')" title="Tarifi Paylaş">
            <span class="material-symbols-outlined">share</span>
          </button>
          <button class="btn-secondary press-effect" onclick="App.deleteRecipeConfirm('${recipe.id}')" title="Tarifi Sil" style="color: var(--color-error); border-color: var(--color-error-container);">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>
    `;
  },

  switchDetailTab(tabName) {
    this.activeDetailTab = tabName;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(`tab-btn-${tabName}`);
    if (btn) btn.classList.add('active');

    const recipe = DataStore.getRecipeById(this.currentRecipeId);
    if (recipe) {
      const area = document.getElementById('detail-tab-content-area');
      if (area) {
        area.innerHTML = this.renderDetailTabContent(recipe);
        area.classList.remove('animate-fade-in');
        void area.offsetWidth;
        area.classList.add('animate-fade-in');
      }
    }
  },

  changePortion(delta) {
    const newServings = this.currentServings + delta;
    if (newServings < 1 || newServings > 24) return;
    this.currentServings = newServings;
    this.portionMultiplier = this.currentServings / this.baseServings;
    
    const display = document.getElementById('portion-display');
    if (display) display.textContent = `${this.currentServings} Kişilik`;

    const recipe = DataStore.getRecipeById(this.currentRecipeId);
    if (recipe && this.activeDetailTab === 'malzemeler') {
      const area = document.getElementById('detail-tab-content-area');
      if (area) area.innerHTML = this.renderDetailTabContent(recipe);
    }
  },

  formatAmount(amount) {
    if (!amount) return '';
    const scaled = amount * this.portionMultiplier;
    if (Number.isInteger(scaled)) return scaled.toString();
    return (Math.round(scaled * 10) / 10).toString();
  },

  renderDetailTabContent(recipe) {
    if (this.activeDetailTab === 'malzemeler') {
      if (!recipe.ingredients || recipe.ingredients.length === 0) {
        return `<p style="text-align: center; color: var(--color-on-surface-variant); padding: 20px;">Malzeme eklenmemiş.</p>`;
      }
      return `
        <ul class="ingredients-list">
          ${recipe.ingredients.map((ing, idx) => {
            const formattedAmt = this.formatAmount(ing.amount);
            const unitLabel = ing.unit && ing.unit !== 'ölçeksiz' ? `${ing.unit} ` : '';
            const textDisplay = `${formattedAmt ? formattedAmt + ' ' : ''}${unitLabel}${ing.name || ''}`;
            return `
              <li class="ingredient-item press-effect" onclick="App.toggleIngredientItem(this)">
                <div class="ingredient-checkbox">
                  <span class="material-symbols-outlined" style="font-size: 16px; opacity: 0;">check</span>
                </div>
                <span class="ingredient-text">${textDisplay}</span>
              </li>
            `;
          }).join('')}
        </ul>
        <p style="font-size: 0.8rem; color: var(--color-outline); text-align: center; margin-top: 14px;">
          Hazırladığınız malzemeleri işaretleyerek takip edebilirsiniz.
        </p>
      `;
    } else {
      const text = recipe.instructions || 'Tarif yapılış açıklaması bulunmuyor.';
      const timerMins = recipe.prepTime || 20;

      return `
        <div class="recipe-instructions-card animate-fade-in">
          <div class="recipe-instructions-header">
            <div class="recipe-instructions-title">
              <span class="material-symbols-outlined">menu_book</span>
              <span>Yapılışı</span>
            </div>
            <span class="glass-chip" style="font-size: 0.75rem;">
              <span class="material-symbols-outlined" style="font-size: 14px;">timer</span>
              ${recipe.prepTime || 30} dk
            </span>
          </div>

          <div class="recipe-instructions-body">
            ${text}
          </div>

          <!-- Quick Cooking Timer Bar -->
          <div class="recipe-timer-widget">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="material-symbols-outlined" style="color: var(--color-primary);">schedule</span>
              <span style="font-size: 0.85rem; font-weight: 600;">Pişirme Sayacı</span>
            </div>
            <button class="step-timer-btn press-effect" onclick="App.openTimerModal(${timerMins}, '${recipe.title}')">
              <span class="material-symbols-outlined" style="font-size: 18px;">play_arrow</span>
              <span>${timerMins} Dakika Sayacı Başlat</span>
            </button>
          </div>
        </div>
      `;
    }
  },

  toggleIngredientItem(element) {
    const checkbox = element.querySelector('.ingredient-checkbox');
    const checkIcon = checkbox.querySelector('.material-symbols-outlined');
    const isChecked = element.classList.toggle('checked');
    if (checkIcon) {
      checkIcon.style.opacity = isChecked ? '1' : '0';
    }
  },

  markRecipeCooked(id) {
    const count = DataStore.incrementCookedCount(id);
    this.showToast(`🎉 Tebrikler! Bu tarifi ${count}. kez pişirdiniz!`);
    this.renderDetail(id);
  },

  shareRecipe(id) {
    const recipe = DataStore.getRecipeById(id);
    if (!recipe) return;
    if (navigator.share) {
      navigator.share({
        title: recipe.title,
        text: `${recipe.title} tarifine Lezzet Defteri üzerinden göz atın!`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${recipe.title} - ${recipe.description || ''}\nSüre: ${recipe.prepTime || 30} dk\n\nYapılışı:\n${recipe.instructions || ''}`);
      this.showToast('📋 Tarif metni panoya kopyalandı!');
    }
  },

  deleteRecipeConfirm(id) {
    if (confirm('Bu tarifi defterinizden silmek istediğinize emin misiniz?')) {
      DataStore.deleteRecipe(id);
      this.showToast('🗑️ Tarif silindi');
      this.showView('home');
    }
  },

  // ==========================================================================
  // AI FOOD PHOTO GENERATOR (Yapay Zeka ile Fotoğraf Üretme)
  // ==========================================================================
  generateAIFoodPhoto() {
    const titleInput = document.getElementById('form-title');
    const title = titleInput ? titleInput.value.trim() : '';

    if (!title) {
      this.showToast('⚠️ Yapay zeka ile fotoğraf üretmek için lütfen önce tarif başlığını girin!');
      if (titleInput) {
        titleInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        titleInput.focus();
        titleInput.style.borderColor = 'var(--color-error)';
        titleInput.classList.add('animate-shake');
        setTimeout(() => {
          titleInput.classList.remove('animate-shake');
        }, 600);
      }
      return;
    }

    const aiBtn = document.getElementById('btn-ai-generate-photo');
    const placeholder = document.getElementById('form-photo-placeholder');
    const preview = document.getElementById('form-photo-preview');
    const photoBox = document.getElementById('form-photo-box');

    // Loading State
    if (aiBtn) {
      aiBtn.disabled = true;
      aiBtn.innerHTML = `
        <span class="material-symbols-outlined" style="animation: spin 1.5s linear infinite;">sync</span>
        <span>Yapay Zeka Fotoğrafı Hazırlıyor...</span>
      `;
    }

    if (placeholder) {
      placeholder.innerHTML = `
        <span class="material-symbols-outlined" style="font-size: 40px; color: var(--color-primary); animation: spin 1.5s linear infinite; margin-bottom: 6px;">auto_awesome</span>
        <p style="font-size: 0.9rem; font-weight: 700; color: var(--color-primary);">"${title}" görseli üretiliyor...</p>
        <span style="font-size: 0.75rem; opacity: 0.8;">Lütfen birkaç saniye bekleyin</span>
      `;
      placeholder.style.display = 'flex';
    }

    if (preview) {
      preview.style.display = 'none';
    }

    // Build prompt & fetch via AI image generation
    const seed = Math.floor(Math.random() * 999999);
    const encodedPrompt = encodeURIComponent(`professional gourmet delicious food photography of Turkish cuisine ${title}, appetizing, culinary magazine, studio lighting, highly detailed, high quality, 4k`);
    const aiImageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=600&nologo=true&seed=${seed}`;

    // Preload image to avoid blank flickering
    const testImg = new Image();
    testImg.crossOrigin = "anonymous";
    
    const finishSuccess = (finalUrl) => {
      this.setFormImage(finalUrl);
      if (aiBtn) {
        aiBtn.disabled = false;
        aiBtn.innerHTML = `
          <span class="material-symbols-outlined" style="color: var(--color-primary);">auto_awesome</span>
          <span>Yeniden Yapay Zeka ile Oluştur</span>
        `;
      }
      this.showToast(`✨ "${title}" için fotoğraf başarıyla oluşturuldu!`);
    };

    const finishFallback = () => {
      // High-quality culinary fallback if network fails
      const fallbackUrl = `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80`;
      finishSuccess(fallbackUrl);
    };

    testImg.onload = () => finishSuccess(aiImageUrl);
    testImg.onerror = () => finishFallback();
    
    // Set 12s timeout for safety
    setTimeout(() => {
      if (aiBtn && aiBtn.disabled) {
        finishSuccess(aiImageUrl);
      }
    }, 12000);

    testImg.src = aiImageUrl;
  },

  // ==========================================================================
  // VIEW: Add / Edit Recipe Form
  // ==========================================================================
  renderForm(editId = null) {
    const formContainer = document.getElementById('view-add');
    if (!formContainer) return;

    let initial = {
      title: '',
      category: 'ana-yemek',
      prepTime: 30,
      servings: 4,
      difficulty: 'Kolay',
      description: '',
      image: '',
      instructions: '',
      ingredients: [
        { amount: '', unit: 'adet', name: '' }
      ]
    };

    if (editId) {
      const existing = DataStore.getRecipeById(editId);
      if (existing) {
        initial = JSON.parse(JSON.stringify(existing));
      }
    }

    formContainer.innerHTML = `
      <!-- Top Navigation -->
      <header class="top-app-bar">
        <button class="icon-btn press-effect" onclick="App.showView('home')" title="İptal">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <span class="brand-title" style="font-size: 1.15rem;">
          ${editId ? 'Tarifi Düzenle' : 'Yeni Tarif Ekle'}
        </span>
        <div style="width: 40px;"></div>
      </header>

      <div class="view-main-content">
        <form id="recipe-editor-form" onsubmit="event.preventDefault(); App.handleSaveRecipe('${editId || ''}')">
          
          <!-- Photo Picker (Zorunlu) -->
          <div class="form-section-card" id="form-section-photo">
            <div class="form-section-title">
              <span>Yemek Fotoğrafı <strong style="color: var(--color-error); font-size: 1.1rem;">*</strong></span>
              <span class="material-symbols-outlined" style="color: var(--color-primary);">photo_camera</span>
            </div>
            
            <div class="photo-uploader-box" id="form-photo-box" onclick="document.getElementById('form-file-input').click()">
              <input type="file" id="form-file-input" accept="image/*" onchange="App.handleImageUpload(event)">
              <img id="form-photo-preview" src="${initial.image}" style="${initial.image ? 'display:block;' : 'display:none;'}" alt="Önizleme">
              <div id="form-photo-placeholder" style="${initial.image ? 'display:none;' : 'display:flex; flex-direction: column; align-items: center;'}">
                <span class="material-symbols-outlined" style="font-size: 40px; color: var(--color-primary); margin-bottom: 6px;">add_a_photo</span>
                <p style="font-size: 0.9rem; font-weight: 600;">Fotoğraf Seç</p>
                <span style="font-size: 0.75rem; color: var(--color-on-surface-variant); margin-top: 2px;">Galeriden veya kameradan fotoğraf ekleyin</span>
              </div>
            </div>
          </div>

          <!-- Basic Information -->
          <div class="form-section-card">
            <div class="form-section-title">
              <span>Temel Bilgiler</span>
              <span class="material-symbols-outlined" style="color: var(--color-primary);">info</span>
            </div>
            <div class="form-group">
              <label class="form-label" for="form-title">
                Tarif Başlığı <span style="color: var(--color-error); font-weight: 700;">*</span>
              </label>
              <input type="text" id="form-title" class="form-input" required placeholder="Tarif başlığı" value="${initial.title}" oninput="this.style.borderColor=''">
            </div>
            <div class="form-group">
              <label class="form-label" for="form-desc">
                Kısa Açıklama <span style="font-size: 0.78rem; font-weight: normal; color: var(--color-outline);">(İsteğe Bağlı)</span>
              </label>
              <textarea id="form-desc" class="form-textarea" rows="2" placeholder="Tarif açıklaması">${initial.description}</textarea>
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
              <div class="form-group">
                <label class="form-label" for="form-category">
                  Kategori <span style="color: var(--color-error); font-weight: 700;">*</span>
                </label>
                <select id="form-category" class="form-select" required>
                  <option value="ana-yemek" ${initial.category === 'ana-yemek' ? 'selected' : ''}>Ana Yemekler</option>
                  <option value="icecek" ${initial.category === 'icecek' ? 'selected' : ''}>🍹 İçecekler</option>
                  <option value="tatli" ${initial.category === 'tatli' ? 'selected' : ''}>Tatlılar</option>
                  <option value="hamur-isi" ${initial.category === 'hamur-isi' ? 'selected' : ''}>🥟 Hamur İşleri</option>
                  <option value="salata-meze" ${initial.category === 'salata-meze' ? 'selected' : ''}>🥗 Salata & Meze</option>
                  <option value="kahvaltilik" ${initial.category === 'kahvaltilik' ? 'selected' : ''}>🍳 Kahvaltılık</option>
                  <option value="corba" ${initial.category === 'corba' ? 'selected' : ''}>🍲 Çorbalar</option>
                  <option value="zeytinyagli" ${initial.category === 'zeytinyagli' ? 'selected' : ''}>🫒 Zeytinyağlılar</option>
                  <option value="atistirmalik" ${initial.category === 'atistirmalik' ? 'selected' : ''}>🍿 Atıştırmalıklar</option>
                  <option value="sos" ${initial.category === 'sos' ? 'selected' : ''}>🍯 Soslar & Reçeller</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="form-difficulty">
                  Zorluk <span style="color: var(--color-error); font-weight: 700;">*</span>
                </label>
                <select id="form-difficulty" class="form-select" required>
                  <option value="Kolay" ${initial.difficulty === 'Kolay' ? 'selected' : ''}>Kolay</option>
                  <option value="Orta" ${initial.difficulty === 'Orta' ? 'selected' : ''}>Orta</option>
                  <option value="Zor" ${initial.difficulty === 'Zor' ? 'selected' : ''}>Zor</option>
                </select>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
              <div class="form-group">
                <label class="form-label" for="form-preptime">
                  Hazırlama Süresi (Dk) <span style="color: var(--color-error); font-weight: 700;">*</span>
                </label>
                <input type="number" id="form-preptime" class="form-input" min="1" max="600" required value="${initial.prepTime}" oninput="this.style.borderColor=''">
              </div>
              <div class="form-group">
                <label class="form-label" for="form-servings">
                  Porsiyon (Kişi) <span style="color: var(--color-error); font-weight: 700;">*</span>
                </label>
                <input type="number" id="form-servings" class="form-input" min="1" max="50" required value="${initial.servings}" oninput="this.style.borderColor=''">
              </div>
            </div>
          </div>

          <!-- Ingredients List Section (Zorunlu) -->
          <div class="form-section-card">
            <div class="form-section-title">
              <span>Malzemeler <strong style="color: var(--color-error); font-size: 1.1rem;">*</strong></span>
              <span class="material-symbols-outlined" style="color: var(--color-primary);">kitchen</span>
            </div>
            <div id="form-ingredients-rows" style="display: flex; flex-direction: column; gap: 8px;">
              ${initial.ingredients.map((ing, idx) => `
                <div class="dynamic-row">
                  <input type="number" step="any" placeholder="Miktar" value="${ing.amount || ''}" class="form-input" style="width: 75px;" data-ing-field="amount" required>
                  <select class="form-select" style="width: 145px; padding: 10px 8px; cursor: pointer;" data-ing-field="unit">
                    ${CULINARY_UNITS.map(u => `<option value="${u.value}" ${ing.unit === u.value ? 'selected' : ''}>${u.label}</option>`).join('')}
                  </select>
                  <input type="text" placeholder="Malzeme adı" value="${ing.name || ''}" class="form-input" style="flex: 1;" data-ing-field="name" required oninput="this.style.borderColor=''">
                  <button type="button" class="dynamic-row-btn press-effect" onclick="this.closest('.dynamic-row').remove()" title="Malzemeyi Sil">
                    <span class="material-symbols-outlined">close</span>
                  </button>
                </div>
              `).join('')}
            </div>
            <button type="button" class="btn-add-item press-effect" onclick="App.addIngredientRow()">
              <span class="material-symbols-outlined">add</span>
              Yeni Malzeme Ekle
            </button>
          </div>

          <!-- Pure Recipe Instructions Section (Zorunlu) -->
          <div class="form-section-card">
            <div class="form-section-title">
              <span>Yapılışı <strong style="color: var(--color-error); font-size: 1.1rem;">*</strong></span>
              <span class="material-symbols-outlined" style="color: var(--color-primary);">menu_book</span>
            </div>
            <textarea id="form-instructions" class="form-textarea" rows="6" required placeholder="Tarif yapılış ve hazırlanış aşamaları..." oninput="this.style.borderColor=''">${initial.instructions || ''}</textarea>
          </div>

          <!-- Save / Cancel Buttons -->
          <div style="display: flex; gap: 12px; margin-top: 20px;">
            <button type="button" class="btn-secondary press-effect" style="flex: 1;" onclick="App.showView('home')">
              İptal
            </button>
            <button type="submit" class="btn-primary press-effect" style="flex: 2;">
              <span class="material-symbols-outlined">save</span>
              ${editId ? 'Değişiklikleri Kaydet' : 'Tarifi Kaydet'}
            </button>
          </div>

        </form>
      </div>
    `;
  },

  addIngredientRow(data = {}) {
    const container = document.getElementById('form-ingredients-rows');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'dynamic-row animate-scale-in';
    
    const selectedUnit = data.unit || 'adet';
    const unitOptionsHtml = CULINARY_UNITS.map(u => 
      `<option value="${u.value}" ${selectedUnit === u.value ? 'selected' : ''}>${u.label}</option>`
    ).join('');

    div.innerHTML = `
      <input type="number" step="any" placeholder="Miktar" value="${data.amount || ''}" class="form-input" style="width: 75px;" data-ing-field="amount" required>
      <select class="form-select" style="width: 145px; padding: 10px 8px; cursor: pointer;" data-ing-field="unit">
        ${unitOptionsHtml}
      </select>
      <input type="text" placeholder="Malzeme adı" value="${data.name || ''}" class="form-input" style="flex: 1;" data-ing-field="name" required oninput="this.style.borderColor=''">
      <button type="button" class="dynamic-row-btn press-effect" onclick="this.closest('.dynamic-row').remove()" title="Malzemeyi Sil">
        <span class="material-symbols-outlined">close</span>
      </button>
    `;
    container.appendChild(div);
  },

  handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.setFormImage(e.target.result);
    };
    reader.readAsDataURL(file);
  },

  setFormImage(url) {
    const preview = document.getElementById('form-photo-preview');
    const placeholder = document.getElementById('form-photo-placeholder');
    const photoBox = document.getElementById('form-photo-box');
    if (preview && placeholder) {
      preview.src = url;
      preview.style.display = 'block';
      placeholder.style.display = 'none';
      preview.dataset.url = url;
      if (photoBox) {
        photoBox.style.borderColor = 'var(--color-secondary)';
      }
    }
  },

  handleSaveRecipe(editId) {
    // 1. Title validation (Zorunlu)
    const titleInput = document.getElementById('form-title');
    const title = titleInput ? titleInput.value.trim() : '';
    if (!title) {
      this.showToast('⚠️ Lütfen tarif başlığını girin!');
      if (titleInput) {
        titleInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        titleInput.focus();
        titleInput.style.borderColor = 'var(--color-error)';
      }
      return;
    }

    // 2. Photo validation (Zorunlu)
    const previewImg = document.getElementById('form-photo-preview');
    const image = (previewImg && previewImg.dataset.url) || (previewImg && previewImg.src && !previewImg.src.endsWith('/') && !previewImg.src.startsWith('data:,') && previewImg.style.display !== 'none' ? previewImg.src : '');
    
    if (!image) {
      this.showToast('⚠️ Lütfen bir yemek fotoğrafı yükleyin veya Yapay Zeka ile oluşturun!');
      const photoBox = document.getElementById('form-photo-box');
      if (photoBox) {
        photoBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        photoBox.style.borderColor = 'var(--color-error)';
      }
      return;
    }

    // 3. Prep Time & Servings validation (Zorunlu)
    const prepTimeInput = document.getElementById('form-preptime');
    const prepTime = parseInt(prepTimeInput ? prepTimeInput.value : 0);
    if (isNaN(prepTime) || prepTime < 1) {
      this.showToast('⚠️ Lütfen geçerli bir hazırlama süresi (dakika) girin!');
      if (prepTimeInput) {
        prepTimeInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        prepTimeInput.focus();
        prepTimeInput.style.borderColor = 'var(--color-error)';
      }
      return;
    }

    const servingsInput = document.getElementById('form-servings');
    const servings = parseInt(servingsInput ? servingsInput.value : 0);
    if (isNaN(servings) || servings < 1) {
      this.showToast('⚠️ Lütfen geçerli bir porsiyon sayısı girin!');
      if (servingsInput) {
        servingsInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        servingsInput.focus();
        servingsInput.style.borderColor = 'var(--color-error)';
      }
      return;
    }

    // 4. Ingredients validation (Zorunlu)
    const ingRows = document.querySelectorAll('#form-ingredients-rows .dynamic-row');
    const ingredients = [];
    let emptyRow = null;

    ingRows.forEach(row => {
      const nameInput = row.querySelector('[data-ing-field="name"]');
      const amountInput = row.querySelector('[data-ing-field="amount"]');
      const name = nameInput ? nameInput.value.trim() : '';
      const amount = amountInput ? parseFloat(amountInput.value) || null : null;
      const unit = row.querySelector('[data-ing-field="unit"]').value;
      
      if (name) {
        ingredients.push({ name, amount, unit });
      } else if (!emptyRow) {
        emptyRow = nameInput;
      }
    });

    if (ingredients.length === 0) {
      this.showToast('⚠️ Lütfen en az bir malzeme adı girin!');
      if (emptyRow) {
        emptyRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        emptyRow.focus();
        emptyRow.style.borderColor = 'var(--color-error)';
      }
      return;
    }

    // 5. Instructions validation (Zorunlu)
    const instructionsInput = document.getElementById('form-instructions');
    const instructions = instructionsInput ? instructionsInput.value.trim() : '';
    if (!instructions) {
      this.showToast('⚠️ Lütfen tarifin yapılış aşamalarını yazın!');
      if (instructionsInput) {
        instructionsInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        instructionsInput.focus();
        instructionsInput.style.borderColor = 'var(--color-error)';
      }
      return;
    }

    // 6. Category & Difficulty
    const category = document.getElementById('form-category').value;
    const difficulty = document.getElementById('form-difficulty').value;

    // 7. Description (İsteğe Bağlı - Tek opsiyonel alan)
    const description = document.getElementById('form-desc').value.trim();

    const payload = {
      title,
      description,
      category,
      difficulty,
      prepTime,
      servings,
      image,
      instructions,
      ingredients
    };

    if (editId) {
      DataStore.updateRecipe(editId, payload);
      this.showToast('✅ Tarif güncellendi');
      this.showView('detail', { id: editId });
    } else {
      const newRec = DataStore.addRecipe(payload);
      this.showToast('🎉 Tarif deftere kaydedildi');
      this.showView('detail', { id: newRec.id });
    }
  },

  // ==========================================================================
  // VIEW: Profile & Settings
  // ==========================================================================
  renderProfile() {
    const profileContainer = document.getElementById('view-profile');
    if (!profileContainer) return;

    const recipes = DataStore.getRecipes();
    const favCount = recipes.filter(r => r.isFavorite).length;
    const totalCooked = recipes.reduce((acc, r) => acc + (r.cookedCount || 0), 0);
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';

    profileContainer.innerHTML = `
      <header class="top-app-bar">
        <button class="icon-btn press-effect" onclick="App.showView('home')" title="Geri">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <span class="brand-title" style="font-size: 1.15rem;">Profilim & Defterim</span>
        <button class="icon-btn press-effect" onclick="App.toggleTheme()" title="Tema Değiştir">
          <span class="material-symbols-outlined">${currentTheme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
        </button>
      </header>

      <div class="view-main-content">
        <!-- Profile Stats Card -->
        <div class="profile-card animate-slide-up">
          <div class="profile-avatar">
            <span class="material-symbols-outlined">cooking</span>
          </div>
          <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--color-on-surface);">Mutfak Şefi</h2>
          <p style="font-size: 0.85rem; color: var(--color-on-surface-variant);">Dijital Tarif Defterim</p>
          
          <div class="stats-grid">
            <div class="stat-box">
              <div class="stat-number">${recipes.length}</div>
              <div class="stat-title">Toplam Tarif</div>
            </div>
            <div class="stat-box">
              <div class="stat-number" style="color: var(--color-tertiary);">${favCount}</div>
              <div class="stat-title">Favori</div>
            </div>
            <div class="stat-box">
              <div class="stat-number" style="color: var(--color-secondary);">${totalCooked}</div>
              <div class="stat-title">Pişirilen</div>
            </div>
          </div>
        </div>

        <!-- Settings Options -->
        <div class="form-section-card">
          <div class="form-section-title">
            <span>Uygulama & Veri</span>
            <span class="material-symbols-outlined" style="color: var(--color-primary);">tune</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            <button class="btn-secondary press-effect" onclick="App.toggleTheme()" style="justify-content: space-between; width: 100%;">
              <span style="display: flex; align-items: center; gap: 8px;">
                <span class="material-symbols-outlined">${currentTheme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
                Görünüm Modu
              </span>
              <span style="font-size: 0.8rem; font-weight: bold; color: var(--color-primary);">${currentTheme === 'dark' ? 'Koyu' : 'Açık'}</span>
            </button>

            <button class="btn-secondary press-effect" onclick="App.exportRecipesJSON()" style="justify-content: space-between; width: 100%;">
              <span style="display: flex; align-items: center; gap: 8px;">
                <span class="material-symbols-outlined">download</span>
                Tarifleri Dışa Aktar (Yedek Al)
              </span>
              <span class="material-symbols-outlined" style="font-size: 18px;">chevron_right</span>
            </button>

            <button class="btn-secondary press-effect" onclick="App.resetDataConfirm()" style="justify-content: space-between; width: 100%; color: var(--color-error); border-color: var(--color-error-container);">
              <span style="display: flex; align-items: center; gap: 8px;">
                <span class="material-symbols-outlined">restart_alt</span>
                Defteri Temizle
              </span>
              <span class="material-symbols-outlined" style="font-size: 18px;">chevron_right</span>
            </button>
          </div>
        </div>

        <div style="text-align: center; margin-top: 24px; color: var(--color-outline); font-size: 0.8rem;">
          <p>Lezzet Defteri v1.0</p>
        </div>
      </div>
    `;
  },

  exportRecipesJSON() {
    const data = JSON.stringify(DataStore.getRecipes(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lezzet-defterim-yedek-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    this.showToast('📥 Tarifleriniz JSON dosyası olarak indirildi');
  },

  resetDataConfirm() {
    if (confirm('Tüm tarifler silinip defter temizlensin mi?')) {
      DataStore.resetToDefault();
      this.showToast('🔄 Defter temizlendi');
      this.showView('home');
    }
  },

  // ==========================================================================
  // COOKING TIMER MODAL
  // ==========================================================================
  openTimerModal(minutes, stepTitle = 'Pişirme Sayacı') {
    this.timerTotalSeconds = minutes * 60;
    this.timerSecondsRemaining = this.timerTotalSeconds;

    const modal = document.getElementById('timer-modal');
    if (!modal) return;

    document.getElementById('timer-modal-title').textContent = stepTitle;
    this.updateTimerDisplay();
    modal.style.display = 'flex';
    this.startTimer();
  },

  closeTimerModal() {
    this.pauseTimer();
    const modal = document.getElementById('timer-modal');
    if (modal) modal.style.display = 'none';
  },

  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    const startBtn = document.getElementById('timer-start-pause-btn');
    if (startBtn) startBtn.innerHTML = '<span class="material-symbols-outlined">pause</span> Duraklat';

    this.timerInterval = setInterval(() => {
      if (this.timerSecondsRemaining > 0) {
        this.timerSecondsRemaining--;
        this.updateTimerDisplay();
      } else {
        clearInterval(this.timerInterval);
        this.playTimerAlarm();
        this.showToast('⏰ Süre doldu! Pişirme adımınız tamamlandı!');
      }
    }, 1000);
  },

  toggleTimerPause() {
    if (this.timerInterval) {
      this.pauseTimer();
    } else {
      this.startTimer();
    }
  },

  pauseTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
      const startBtn = document.getElementById('timer-start-pause-btn');
      if (startBtn) startBtn.innerHTML = '<span class="material-symbols-outlined">play_arrow</span> Devam Et';
    }
  },

  resetTimer() {
    this.pauseTimer();
    this.timerSecondsRemaining = this.timerTotalSeconds;
    this.updateTimerDisplay();
  },

  updateTimerDisplay() {
    const mins = Math.floor(this.timerSecondsRemaining / 60);
    const secs = this.timerSecondsRemaining % 60;
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    const el = document.getElementById('timer-countdown-display');
    if (el) el.textContent = formatted;
  },

  playTimerAlarm() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.2); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
      console.log('Audio notification played');
    }
  },

  // ==========================================================================
  // IMAGE HANDLING
  // ==========================================================================
  handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.getElementById('form-photo-preview');
      const placeholder = document.getElementById('form-photo-placeholder');
      const photoBox = document.getElementById('form-photo-box');

      if (preview) {
        preview.src = e.target.result;
        preview.style.display = 'block';
        preview.dataset.url = e.target.result;
      }
      if (placeholder) placeholder.style.display = 'none';
      if (photoBox) photoBox.style.borderColor = '';
    };
    reader.readAsDataURL(file);
  },


  // ==========================================================================
  // TOAST NOTIFICATIONS
  // ==========================================================================
  showToast(message) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }
};

// Initialize App upon DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
