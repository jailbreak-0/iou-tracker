/**
 * Analytics Service - Pro Version Only
 * Provides detailed insights and statistics for IOU tracking
 * Advanced analytics, trends, and reporting features
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { isProVersion } from './pro';

// Storage keys for analytics data
const ANALYTICS_KEYS = {
  MONTHLY_STATS: 'analytics_monthly_stats',
  YEARLY_STATS: 'analytics_yearly_stats',
  CATEGORY_STATS: 'analytics_category_stats',
  USER_BEHAVIOR: 'analytics_user_behavior',
  TRENDS_DATA: 'analytics_trends_data',
};

// Analytics interfaces
export interface IOUAnalytics {
  id: string;
  amount: number;
  category: string;
  type: 'owe' | 'owed';
  date: string;
  dueDate?: string;
  status: 'pending' | 'paid' | 'overdue';
  personName: string;
  createdAt: string;
  paidAt?: string;
}

export interface MonthlyStats {
  month: string;
  year: number;
  totalAmount: number;
  totalOwed: number;
  totalOwe: number;
  transactionCount: number;
  paidCount: number;
  overdueCount: number;
  averageAmount: number;
  topCategory: string;
  topPerson: string;
}

export interface CategoryStats {
  category: string;
  totalAmount: number;
  count: number;
  percentage: number;
  averageAmount: number;
  color: string;
}

export interface TrendData {
  period: string;
  value: number;
  change: number;
  changePercentage: number;
}

export interface AnalyticsInsight {
  id: string;
  type: 'warning' | 'info' | 'success' | 'tip';
  title: string;
  description: string;
  actionText?: string;
  recommendation?: string;
  priority: number;
}

export interface AnalyticsSummary {
  totalAmount: number;
  totalOwed: number;
  totalOwe: number;
  netAmount: number;
  totalTransactions: number;
  paidTransactions: number;
  pendingTransactions: number;
  overdueTransactions: number;
  averageAmount: number;
  mostActiveMonth: string;
  topCategory: string;
  topPerson: string;
  paymentRate: number; // Percentage of paid vs total
  overdueRate: number; // Percentage of overdue vs total
  // Additional fields for dashboard compatibility
  totalIOUs: number;
  totalOwedToUser: number;
  totalUserOwes: number;
  netBalance: number;
  activeIOUsOwedToUser: number;
  activeIOUsUserOwes: number;
  totalOverdue: number;
  overdueIOUs: number;
}

export interface ComprehensiveAnalytics {
  summary: AnalyticsSummary;
  monthlyStats: MonthlyStats[];
  categoryStats: CategoryStats[];
  trendData: TrendData[];
  insights: AnalyticsInsight[];
}

class AnalyticsService {
  private static instance: AnalyticsService;

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Check if analytics are available (Pro version only)
   */
  isAvailable(): boolean {
    return isProVersion();
  }

  /**
   * Process IOU data and generate comprehensive analytics
   */
  async generateAnalytics(ious: IOUAnalytics[] = []): Promise<ComprehensiveAnalytics> {
    if (!this.isAvailable()) {
      throw new Error('Analytics are only available in Pro version');
    }

    // If no IOUs provided, load from storage
    if (ious.length === 0) {
      ious = await this.loadIOUData();
    }

    // Generate all analytics components
    const summary = await this.generateSummary(ious);
    const monthlyStats = await this.generateMonthlyStats(ious);
    const categoryStats = await this.generateCategoryStats(ious);
    const trendData = await this.generateTrendData(ious);
    const insights = await this.generateInsights(summary, trendData);

    const analytics: ComprehensiveAnalytics = {
      summary,
      monthlyStats,
      categoryStats,
      trendData,
      insights,
    };

    // Cache the results
    await this.cacheAnalytics(analytics);
    
    return analytics;
  }

  /**
   * Generate summary statistics
   */
  async generateSummary(ious: IOUAnalytics[]): Promise<AnalyticsSummary> {
    if (!this.isAvailable()) {
      throw new Error('Analytics are only available in Pro version');
    }

    // Calculate basic statistics
    const totalAmount = ious.reduce((sum, iou) => sum + Math.abs(iou.amount), 0);
    const totalOwed = ious.filter(iou => iou.type === 'owed').reduce((sum, iou) => sum + iou.amount, 0);
    const totalOwe = ious.filter(iou => iou.type === 'owe').reduce((sum, iou) => sum + Math.abs(iou.amount), 0);
    const netAmount = totalOwed - totalOwe;
    
    const paidIOUs = ious.filter(iou => iou.status === 'paid');
    const pendingIOUs = ious.filter(iou => iou.status === 'pending');
    const overdueIOUs = ious.filter(iou => iou.status === 'overdue');
    
    // Active IOUs (pending + overdue)
    const activeOwedToUser = ious.filter(iou => iou.type === 'owed' && iou.status !== 'paid');
    const activeUserOwes = ious.filter(iou => iou.type === 'owe' && iou.status !== 'paid');
    const totalOverdueAmount = overdueIOUs.reduce((sum, iou) => sum + Math.abs(iou.amount), 0);
    
    const averageAmount = ious.length > 0 ? totalAmount / ious.length : 0;
    const paymentRate = ious.length > 0 ? (paidIOUs.length / ious.length) * 100 : 0;
    const overdueRate = ious.length > 0 ? (overdueIOUs.length / ious.length) * 100 : 0;

    // Find most active month
    const monthCounts: { [key: string]: number } = {};
    ious.forEach(iou => {
      const month = new Date(iou.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      monthCounts[month] = (monthCounts[month] || 0) + 1;
    });
    const mostActiveMonth = Object.keys(monthCounts).reduce((a, b) => 
      monthCounts[a] > monthCounts[b] ? a : b, Object.keys(monthCounts)[0] || 'None'
    );

    // Find top category
    const categoryCounts: { [key: string]: number } = {};
    ious.forEach(iou => {
      categoryCounts[iou.category] = (categoryCounts[iou.category] || 0) + 1;
    });
    const topCategory = Object.keys(categoryCounts).reduce((a, b) => 
      categoryCounts[a] > categoryCounts[b] ? a : b, Object.keys(categoryCounts)[0] || 'None'
    );

    // Find top person
    const personCounts: { [key: string]: number } = {};
    ious.forEach(iou => {
      personCounts[iou.personName] = (personCounts[iou.personName] || 0) + 1;
    });
    const topPerson = Object.keys(personCounts).reduce((a, b) => 
      personCounts[a] > personCounts[b] ? a : b, Object.keys(personCounts)[0] || 'None'
    );

    const summary: AnalyticsSummary = {
      totalAmount,
      totalOwed,
      totalOwe,
      netAmount,
      totalTransactions: ious.length,
      paidTransactions: paidIOUs.length,
      pendingTransactions: pendingIOUs.length,
      overdueTransactions: overdueIOUs.length,
      averageAmount,
      mostActiveMonth,
      topCategory,
      topPerson,
      paymentRate,
      overdueRate,
      // Dashboard compatibility fields
      totalIOUs: ious.length,
      totalOwedToUser: totalOwed,
      totalUserOwes: totalOwe,
      netBalance: netAmount,
      activeIOUsOwedToUser: activeOwedToUser.length,
      activeIOUsUserOwes: activeUserOwes.length,
      totalOverdue: totalOverdueAmount,
      overdueIOUs: overdueIOUs.length,
    };

    return summary;
  }

  /**
   * Load IOU data from storage (mock implementation)
   */
  private async loadIOUData(): Promise<IOUAnalytics[]> {
    // This would typically load from your actual IOU storage
    // For now, return empty array - implement based on your storage system
    try {
      const stored = await AsyncStorage.getItem('ious');
      if (stored) {
        const ious = JSON.parse(stored);
        // Convert your IOU format to IOUAnalytics format
        return this.convertToAnalyticsFormat(ious);
      }
    } catch (error) {
      console.error('Failed to load IOU data:', error);
    }
    return [];
  }

  /**
   * Convert your IOU format to analytics format
   */
  private convertToAnalyticsFormat(ious: any[]): IOUAnalytics[] {
    return ious.map(iou => ({
      id: iou.id || Math.random().toString(36).substr(2, 9),
      amount: Math.abs(iou.amount || 0),
      category: iou.category || 'General',
      type: iou.amount > 0 ? 'owed' : 'owe',
      date: iou.date || new Date().toISOString(),
      dueDate: iou.dueDate,
      status: iou.paid ? 'paid' : (iou.overdue ? 'overdue' : 'pending'),
      personName: iou.personName || iou.name || 'Unknown',
      createdAt: iou.createdAt || iou.date || new Date().toISOString(),
      paidAt: iou.paidAt,
    }));
  }

  /**
   * Generate monthly statistics
   */
  async generateMonthlyStats(ious: IOUAnalytics[]): Promise<MonthlyStats[]> {
    if (!this.isAvailable()) {
      throw new Error('Analytics are only available in Pro version');
    }

    const monthlyData: { [key: string]: IOUAnalytics[] } = {};
    
    // Group IOUs by month
    ious.forEach(iou => {
      const date = new Date(iou.date);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!monthlyData[key]) {
        monthlyData[key] = [];
      }
      monthlyData[key].push(iou);
    });

    // Generate stats for each month
    const monthlyStats: MonthlyStats[] = [];
    
    Object.keys(monthlyData).forEach(key => {
      const [year, monthIndex] = key.split('-');
      const monthIOUs = monthlyData[key];
      const date = new Date(parseInt(year), parseInt(monthIndex));
      
      const totalAmount = monthIOUs.reduce((sum, iou) => sum + iou.amount, 0);
      const totalOwed = monthIOUs.filter(iou => iou.type === 'owed').reduce((sum, iou) => sum + iou.amount, 0);
      const totalOwe = monthIOUs.filter(iou => iou.type === 'owe').reduce((sum, iou) => sum + iou.amount, 0);
      const paidCount = monthIOUs.filter(iou => iou.status === 'paid').length;
      const overdueCount = monthIOUs.filter(iou => iou.status === 'overdue').length;
      const averageAmount = monthIOUs.length > 0 ? totalAmount / monthIOUs.length : 0;

      // Find top category and person for the month
      const categoryCounts: { [key: string]: number } = {};
      const personCounts: { [key: string]: number } = {};
      
      monthIOUs.forEach(iou => {
        categoryCounts[iou.category] = (categoryCounts[iou.category] || 0) + 1;
        personCounts[iou.personName] = (personCounts[iou.personName] || 0) + 1;
      });
      
      const topCategory = Object.keys(categoryCounts).reduce((a, b) => 
        categoryCounts[a] > categoryCounts[b] ? a : b, 'None'
      );
      const topPerson = Object.keys(personCounts).reduce((a, b) => 
        personCounts[a] > personCounts[b] ? a : b, 'None'
      );

      monthlyStats.push({
        month: date.toLocaleDateString('en-US', { month: 'long' }),
        year: parseInt(year),
        totalAmount,
        totalOwed,
        totalOwe,
        transactionCount: monthIOUs.length,
        paidCount,
        overdueCount,
        averageAmount,
        topCategory,
        topPerson,
      });
    });

    return monthlyStats.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];
      return monthOrder.indexOf(b.month) - monthOrder.indexOf(a.month);
    });
  }

  /**
   * Generate category statistics
   */
  async generateCategoryStats(ious: IOUAnalytics[]): Promise<CategoryStats[]> {
    if (!this.isAvailable()) {
      throw new Error('Analytics are only available in Pro version');
    }

    const categoryData: { [key: string]: { amount: number; count: number } } = {};
    const totalAmount = ious.reduce((sum, iou) => sum + iou.amount, 0);

    // Group by category
    ious.forEach(iou => {
      if (!categoryData[iou.category]) {
        categoryData[iou.category] = { amount: 0, count: 0 };
      }
      categoryData[iou.category].amount += iou.amount;
      categoryData[iou.category].count += 1;
    });

    // Generate category colors
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA726', '#AB47BC', '#66BB6A', '#EF5350', '#26A69A'];
    
    const categoryStats: CategoryStats[] = Object.keys(categoryData).map((category, index) => {
      const data = categoryData[category];
      return {
        category,
        totalAmount: data.amount,
        count: data.count,
        percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
        averageAmount: data.count > 0 ? data.amount / data.count : 0,
        color: colors[index % colors.length],
      };
    });

    return categoryStats.sort((a, b) => b.totalAmount - a.totalAmount);
  }

  /**
   * Generate trend data for the last 6 months
   */
  async generateTrendData(ious: IOUAnalytics[]): Promise<TrendData[]> {
    if (!this.isAvailable()) {
      throw new Error('Analytics are only available in Pro version');
    }

    const trendData: TrendData[] = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const monthIOUs = ious.filter(iou => {
        const iouDate = new Date(iou.date);
        return iouDate >= date && iouDate < nextDate;
      });

      const currentValue = monthIOUs.reduce((sum, iou) => sum + iou.amount, 0);
      const prevDate = new Date(now.getFullYear(), now.getMonth() - i - 1, 1);
      const prevNextDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      
      const prevMonthIOUs = ious.filter(iou => {
        const iouDate = new Date(iou.date);
        return iouDate >= prevDate && iouDate < prevNextDate;
      });
      
      const prevValue = prevMonthIOUs.reduce((sum, iou) => sum + iou.amount, 0);
      const change = currentValue - prevValue;
      const changePercentage = prevValue > 0 ? (change / prevValue) * 100 : 0;

      trendData.push({
        period: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        value: currentValue,
        change,
        changePercentage,
      });
    }

    return trendData;
  }

  /**
   * Generate insights and recommendations
   */
  async generateInsights(summary: AnalyticsSummary, trends: TrendData[]): Promise<AnalyticsInsight[]> {
    if (!this.isAvailable()) {
      throw new Error('Analytics are only available in Pro version');
    }

    const insights: AnalyticsInsight[] = [];

    // High overdue rate warning
    if (summary.overdueRate > 30) {
      insights.push({
        id: 'high_overdue_rate',
        type: 'warning',
        title: 'High Overdue Rate',
        description: `${summary.overdueRate.toFixed(1)}% of your IOUs are overdue. Consider setting up reminders.`,
        actionText: 'Set Reminders',
        priority: 1,
      });
    }

    // Positive net amount
    if (summary.netAmount > 0) {
      insights.push({
        id: 'positive_net',
        type: 'success',
        title: 'Positive Net Amount',
        description: `You have a net positive of $${summary.netAmount.toFixed(2)}. Great job managing your finances!`,
        priority: 2,
      });
    }

    // Negative net amount warning
    if (summary.netAmount < -100) {
      insights.push({
        id: 'negative_net',
        type: 'warning',
        title: 'High Outstanding Debt',
        description: `You owe $${Math.abs(summary.netAmount).toFixed(2)} more than you're owed. Consider paying off some debts.`,
        priority: 1,
      });
    }

    // Rising trend
    const recentTrends = trends.slice(-3);
    const avgChange = recentTrends.reduce((sum, t) => sum + t.changePercentage, 0) / recentTrends.length;
    if (avgChange > 20) {
      insights.push({
        id: 'rising_trend',
        type: 'info',
        title: 'Increasing Activity',
        description: `Your IOU activity has increased by ${avgChange.toFixed(1)}% recently.`,
        priority: 3,
      });
    }

    // High payment rate
    if (summary.paymentRate > 80) {
      insights.push({
        id: 'good_payment_rate',
        type: 'success',
        title: 'Excellent Payment Rate',
        description: `${summary.paymentRate.toFixed(1)}% of your IOUs are paid. Keep up the good work!`,
        priority: 2,
      });
    }

    // Category concentration tip
    insights.push({
      id: 'category_tip',
      type: 'tip',
      title: 'Most Active Category',
      description: `Most of your IOUs are in "${summary.topCategory}". Consider tracking subcategories for better insights.`,
      priority: 4,
    });

    return insights.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Cache analytics data
   */
  private async cacheAnalytics(data: any): Promise<void> {
    try {
      await AsyncStorage.setItem('cached_analytics', JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('Failed to cache analytics:', error);
    }
  }

  /**
   * Get cached analytics (if available and recent)
   */
  async getCachedAnalytics(): Promise<AnalyticsSummary | null> {
    try {
      const cached = await AsyncStorage.getItem('cached_analytics');
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        const maxAge = 30 * 60 * 1000; // 30 minutes
        
        if (age < maxAge) {
          return data;
        }
      }
    } catch (error) {
      console.error('Failed to get cached analytics:', error);
    }
    return null;
  }

  /**
   * Export analytics data for external use
   */
  async exportAnalytics(summary: AnalyticsSummary, monthlyStats: MonthlyStats[]): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Analytics export is only available in Pro version');
    }

    const exportData = {
      generatedAt: new Date().toISOString(),
      summary,
      monthlyStats,
      version: '1.0',
    };

    return JSON.stringify(exportData, null, 2);
  }
}

// Export singleton instance
export const Analytics = AnalyticsService.getInstance();
export default AnalyticsService;