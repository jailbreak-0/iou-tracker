/**
 * Category Management System (Pro Feature)
 * Handles custom categories for organizing IOUs
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Category } from '@/types';
import { hasProFeature, ProFeature, showProUpgrade } from './pro';

const CATEGORIES_STORAGE_KEY = '@iou_categories';

// Default categories
const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'general',
    name: 'General',
    color: '#007AFF',
    icon: 'banknote',
    createdAt: new Date().toISOString(),
    isDefault: true,
  },
  {
    id: 'personal',
    name: 'Personal',
    color: '#34C759',
    icon: 'person',
    createdAt: new Date().toISOString(),
    isDefault: true,
  },
  {
    id: 'business',
    name: 'Business',
    color: '#FF9500',
    icon: 'building',
    createdAt: new Date().toISOString(),
    isDefault: true,
  },
  {
    id: 'family',
    name: 'Family',
    color: '#FF2D92',
    icon: 'house',
    createdAt: new Date().toISOString(),
    isDefault: true,
  },
];

class CategoryManager {
  private static instance: CategoryManager;
  private _categories: Category[] = [];
  private _initialized: boolean = false;

  private constructor() {}

  static getInstance(): CategoryManager {
    if (!CategoryManager.instance) {
      CategoryManager.instance = new CategoryManager();
    }
    return CategoryManager.instance;
  }

  /**
   * Initialize categories from storage
   */
  async initializeCategories(): Promise<void> {
    if (this._initialized) return;

    try {
      const stored = await AsyncStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (stored) {
        this._categories = JSON.parse(stored);
      } else {
        // First time - create default categories
        this._categories = [...DEFAULT_CATEGORIES];
        await this.saveCategories();
      }
      this._initialized = true;
    } catch (error) {
      console.error('Error initializing categories:', error);
      this._categories = [...DEFAULT_CATEGORIES];
      this._initialized = true;
    }
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<Category[]> {
    await this.initializeCategories();
    return [...this._categories];
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: string): Promise<Category | null> {
    await this.initializeCategories();
    return this._categories.find(cat => cat.id === id) || null;
  }

  /**
   * Create new category (Pro Feature)
   */
  async createCategory(
    name: string, 
    color: string = '#007AFF', 
    icon: string = 'banknote'
  ): Promise<Category | null> {
    if (!hasProFeature(ProFeature.CUSTOM_CATEGORIES)) {
      showProUpgrade(ProFeature.CUSTOM_CATEGORIES);
      return null;
    }

    await this.initializeCategories();

    // Check if name already exists
    if (this._categories.some(cat => cat.name.toLowerCase() === name.toLowerCase())) {
      throw new Error('Category name already exists');
    }

    const newCategory: Category = {
      id: `category_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      color: color,
      icon: icon,
      createdAt: new Date().toISOString(),
      isDefault: false,
    };

    this._categories.push(newCategory);
    await this.saveCategories();
    
    return newCategory;
  }

  /**
   * Update existing category (Pro Feature)
   */
  async updateCategory(
    id: string, 
    updates: Partial<Pick<Category, 'name' | 'color' | 'icon'>>
  ): Promise<Category | null> {
    if (!hasProFeature(ProFeature.CUSTOM_CATEGORIES)) {
      showProUpgrade(ProFeature.CUSTOM_CATEGORIES);
      return null;
    }

    await this.initializeCategories();

    const categoryIndex = this._categories.findIndex(cat => cat.id === id);
    if (categoryIndex === -1) {
      throw new Error('Category not found');
    }

    const category = this._categories[categoryIndex];
    
    // Check if new name conflicts with existing categories
    if (updates.name && updates.name !== category.name) {
      if (this._categories.some(cat => cat.name.toLowerCase() === updates.name!.toLowerCase() && cat.id !== id)) {
        throw new Error('Category name already exists');
      }
    }

    // Update category
    this._categories[categoryIndex] = {
      ...category,
      ...updates,
      name: updates.name?.trim() || category.name,
    };

    await this.saveCategories();
    return this._categories[categoryIndex];
  }

  /**
   * Delete category (Pro Feature)
   */
  async deleteCategory(id: string): Promise<boolean> {
    if (!hasProFeature(ProFeature.CUSTOM_CATEGORIES)) {
      showProUpgrade(ProFeature.CUSTOM_CATEGORIES);
      return false;
    }

    await this.initializeCategories();

    const category = this._categories.find(cat => cat.id === id);
    if (!category) {
      throw new Error('Category not found');
    }

    if (category.isDefault) {
      throw new Error('Cannot delete default category');
    }

    // TODO: Check if category is in use by any IOUs
    // For now, we'll allow deletion but should handle reassignment

    this._categories = this._categories.filter(cat => cat.id !== id);
    await this.saveCategories();
    
    return true;
  }

  /**
   * Get categories summary with IOU counts
   */
  async getCategoriesSummary(ious: any[]): Promise<Array<Category & { iouCount: number; totalAmount: number }>> {
    const categories = await this.getCategories();
    
    return categories.map(category => {
      const categoryIOUs = ious.filter(iou => 
        (iou.categoryId === category.id) || 
        (!iou.categoryId && category.id === 'general') // Default to general
      );
      
      const totalAmount = categoryIOUs
        .filter(iou => !iou.isSettled)
        .reduce((sum, iou) => sum + iou.amount, 0);

      return {
        ...category,
        iouCount: categoryIOUs.filter(iou => !iou.isSettled).length,
        totalAmount,
      };
    });
  }

  /**
   * Get available category colors
   */
  getCategoryColors(): string[] {
    return [
      '#007AFF', // Blue
      '#34C759', // Green
      '#FF9500', // Orange
      '#FF2D92', // Pink
      '#5856D6', // Purple
      '#FF3B30', // Red
      '#00C7BE', // Teal
      '#FFCC00', // Yellow
      '#8E8E93', // Gray
      '#A2845E', // Brown
    ];
  }

  /**
   * Get available category icons
   */
  getCategoryIcons(): Array<{ name: string; label: string }> {
    return [
      { name: 'banknote', label: 'Money' },
      { name: 'person', label: 'Person' },
      { name: 'building', label: 'Business' },
      { name: 'house', label: 'Home' },
      { name: 'car', label: 'Car' },
      { name: 'cart', label: 'Shopping' },
      { name: 'gamecontroller', label: 'Entertainment' },
      { name: 'book', label: 'Education' },
      { name: 'heart', label: 'Health' },
      { name: 'airplane', label: 'Travel' },
      { name: 'gift', label: 'Gift' },
      { name: 'star', label: 'Special' },
    ];
  }

  /**
   * Save categories to storage
   */
  private async saveCategories(): Promise<void> {
    try {
      await AsyncStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(this._categories));
    } catch (error) {
      console.error('Error saving categories:', error);
      throw error;
    }
  }

  /**
   * Reset to default categories
   */
  async resetToDefaults(): Promise<void> {
    this._categories = [...DEFAULT_CATEGORIES];
    await this.saveCategories();
  }
}

// Export singleton instance
export const CategorySystem = CategoryManager.getInstance();

// Convenience functions
export const getCategories = () => CategorySystem.getCategories();
export const getCategoryById = (id: string) => CategorySystem.getCategoryById(id);
export const createCategory = (name: string, color?: string, icon?: string) => 
  CategorySystem.createCategory(name, color, icon);
export const updateCategory = (id: string, updates: any) => 
  CategorySystem.updateCategory(id, updates);
export const deleteCategory = (id: string) => CategorySystem.deleteCategory(id);