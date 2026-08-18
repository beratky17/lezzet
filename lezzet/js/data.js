/**
 * Data Storage & Recipe Data - Dijital Tarif Defterim
 */

const STORAGE_KEY = 'lezzet_defteri_recipes_v5';
const FAVORITES_KEY = 'lezzet_defteri_favorites_v1';
const SETTINGS_KEY = 'lezzet_defteri_settings_v1';

// Boş başlangıç tarif listesi (Kullanıcı kendi tariflerini ekler)
const INITIAL_RECIPES = [];

// Curated list of Turkish culinary measurement units
const CULINARY_UNITS = [
  { value: 'adet', label: 'Adet' },
  { value: 'su bardağı', label: 'Su Bardağı' },
  { value: 'çay bardağı', label: 'Çay Bardağı' },
  { value: 'yemek kaşığı', label: 'Yemek Kaşığı' },
  { value: 'tatlı kaşığı', label: 'Tatlı Kaşığı' },
  { value: 'çay kaşığı', label: 'Çay Kaşığı' },
  { value: 'gram', label: 'Gram (gr)' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'ml', label: 'Mililitre (ml)' },
  { value: 'litre', label: 'Litre (L)' },
  { value: 'paket', label: 'Paket' },
  { value: 'demet', label: 'Demet' },
  { value: 'dilim', label: 'Dilim' },
  { value: 'tutam', label: 'Tutam' },
  { value: 'diş', label: 'Diş' },
  { value: 'kase', label: 'Kase' },
  { value: 'porsiyon', label: 'Porsiyon' }
];

// Data Repository Manager
const DataStore = {
  getRecipes() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        this.saveRecipes(INITIAL_RECIPES);
        return INITIAL_RECIPES;
      }
      const parsed = JSON.parse(data);
      return parsed.map(r => {
        if (!r.instructions) {
          r.instructions = r.rawInstructions || (r.steps ? r.steps.map(s => s.text).join('\n\n') : '');
        }
        return r;
      });
    } catch (e) {
      console.error('LocalStorage read error:', e);
      return INITIAL_RECIPES;
    }
  },

  saveRecipes(recipes) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
    } catch (e) {
      console.error('LocalStorage write error:', e);
    }
  },

  getRecipeById(id) {
    const recipes = this.getRecipes();
    return recipes.find(r => r.id === id) || null;
  },

  addRecipe(recipeData) {
    const recipes = this.getRecipes();
    const newRecipe = {
      id: 'rec_' + Date.now(),
      title: recipeData.title || 'İsimsiz Tarif',
      category: recipeData.category || 'ana-yemek',
      categoryLabel: this.getCategoryLabel(recipeData.category || 'ana-yemek'),
      description: recipeData.description || '',
      prepTime: parseInt(recipeData.prepTime) || 30,
      difficulty: recipeData.difficulty || 'Kolay',
      servings: parseInt(recipeData.servings) || 4,
      image: recipeData.image || '',
      instructions: recipeData.instructions || '',
      ingredients: recipeData.ingredients || [],
      isFavorite: false,
      cookedCount: 0,
      createdAt: new Date().toISOString()
    };
    recipes.unshift(newRecipe);
    this.saveRecipes(recipes);
    return newRecipe;
  },

  updateRecipe(id, recipeData) {
    const recipes = this.getRecipes();
    const index = recipes.findIndex(r => r.id === id);
    if (index !== -1) {
      recipes[index] = {
        ...recipes[index],
        ...recipeData,
        categoryLabel: this.getCategoryLabel(recipeData.category || recipes[index].category),
        updatedAt: new Date().toISOString()
      };
      this.saveRecipes(recipes);
      return recipes[index];
    }
    return null;
  },

  deleteRecipe(id) {
    let recipes = this.getRecipes();
    recipes = recipes.filter(r => r.id !== id);
    this.saveRecipes(recipes);
    return true;
  },

  toggleFavorite(id) {
    const recipes = this.getRecipes();
    const recipe = recipes.find(r => r.id === id);
    if (recipe) {
      recipe.isFavorite = !recipe.isFavorite;
      this.saveRecipes(recipes);
      return recipe.isFavorite;
    }
    return false;
  },

  incrementCookedCount(id) {
    const recipes = this.getRecipes();
    const recipe = recipes.find(r => r.id === id);
    if (recipe) {
      recipe.cookedCount = (recipe.cookedCount || 0) + 1;
      this.saveRecipes(recipes);
      return recipe.cookedCount;
    }
    return 0;
  },

  getCategoryLabel(categoryKey) {
    const map = {
      'ana-yemek': 'Ana Yemekler',
      'tatli': 'Tatlılar',
      'icecek': 'İçecekler',
      'kahvaltilik': 'Kahvaltılık',
      'hamur-isi': 'Hamur İşleri',
      'salata-meze': 'Salata & Meze',
      'corba': 'Çorbalar',
      'zeytinyagli': 'Zeytinyağlılar',
      'atistirmalik': 'Atıştırmalıklar',
      'sos': 'Soslar & Reçeller'
    };
    return map[categoryKey] || 'Genel';
  },

  resetToDefault() {
    localStorage.removeItem(STORAGE_KEY);
    return this.getRecipes();
  }
};
