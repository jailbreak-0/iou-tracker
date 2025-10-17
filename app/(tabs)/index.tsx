import AdBanner from '@/components/AdBanner';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Category, IOU, UserSummary } from '@/types';
import { getCategories } from '@/utils/categories';
import { formatDate } from '@/utils/localization';
import { hasProFeature, ProFeature } from '@/utils/pro';
import { calculateSummary, loadIOUs, loadSettings, settleIOU } from '@/utils/storage';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const [ious, setIOUs] = useState<IOU[]>([]);
  const [filteredIOUs, setFilteredIOUs] = useState<IOU[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [summary, setSummary] = useState<UserSummary>({
    totalOwed: 0,
    totalOwing: 0,
    netBalance: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [userCurrency, setUserCurrency] = useState('USD');
  const [dateFormat, setDateFormat] = useState('MM/dd/yyyy');

  const loadData = useCallback(async () => {
    try {
      const allIOUs = await loadIOUs();
      const activeIOUs = allIOUs.filter(iou => !iou.isSettled);
      const settings = await loadSettings();
      const availableCategories = await getCategories();
      
      setIOUs(activeIOUs);
      setCategories(availableCategories);
      setSummary(calculateSummary(allIOUs));
      setUserCurrency(settings.currency);
      setDateFormat(settings.dateFormat);
      
      // Apply category filter if one is selected
      filterIOUsByCategory(activeIOUs, selectedCategory);
    } catch (error) {
      Alert.alert('Error', 'Failed to load data');
    }
  }, [selectedCategory]);

  const filterIOUsByCategory = useCallback((iouList: IOU[], category: Category | null) => {
    if (!category) {
      setFilteredIOUs(iouList);
    } else {
      const filtered = iouList.filter(iou => iou.categoryId === category.id);
      setFilteredIOUs(filtered);
    }
  }, []);

  const handleCategoryFilter = (category: Category | null) => {
    setSelectedCategory(category);
    filterIOUsByCategory(ious, category);
    setShowCategoryFilter(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const formatCurrencyAmount = (amount: number) => {
    // Add proper currency symbols
    const currencySymbols: { [key: string]: string } = {
      USD: '$',
      GHS: '₵',
      NGN: '₦', 
      FCFA: 'CFA',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      CNY: '¥',
      INR: '₹',
      AUD: 'A$',
      CAD: 'C$',
      CHF: 'CHF',
      SEK: 'kr',
      NZD: 'NZ$',
      MXN: 'Mex$',
      SGD: 'S$',
      HKD: 'HK$',
      NOK: 'kr',
      KRW: '₩',
      TRY: '₺',
      RUB: '₽',
      BRL: 'R$',
      ZAR: 'R',
    };
    
    const symbol = currencySymbols[userCurrency] || userCurrency;
    if (userCurrency === 'FCFA') {
      return `${amount.toFixed(2)} ${symbol}`;
    }
    return `${symbol}${amount.toFixed(2)}`;
  };

  const handleSettleIOU = async (iou: IOU) => {
    Alert.alert(
      'Settle Transaction',
      `Are you sure you want to mark this as settled?\n\n${iou.type === 'lent' ? 'You lent' : 'You borrowed'} ${formatCurrencyAmount(iou.amount)} ${iou.type === 'lent' ? 'to' : 'from'} ${iou.personName}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Settle',
          onPress: async () => {
            try {
              await settleIOU(iou.id);
              await loadData();
              Alert.alert('Success', 'Transaction marked as settled');
            } catch (error) {
              Alert.alert('Error', 'Failed to settle transaction');
            }
          }
        }
      ]
    );
  };

  const handleAddTransaction = (type: 'lent' | 'borrowed') => {
    setShowActionModal(false);
    // Navigate to add form
    router.push({
      pathname: '/add-iou' as any,
      params: { type }
    });
  };

  const SummaryCard = ({ title, amount, color }: { title: string; amount: number; color: string }) => (
    <ThemedView style={[styles.summaryCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <ThemedText style={styles.summaryTitle}>{title}</ThemedText>
      <Text style={[styles.summaryAmount, { color }]}>
        {formatCurrencyAmount(Math.abs(amount))}
      </Text>
    </ThemedView>
  );

  const IOUItem = ({ iou }: { iou: IOU }) => (
    <ThemedView style={styles.iouItem}>
      <View style={styles.iouHeader}>
        <View style={styles.iouInfo}>
          <Text style={[
            styles.iouType,
            { color: iou.type === 'lent' ? Colors[colorScheme ?? 'light'].tint : '#FF6B6B' }
          ]}>
            {iou.type === 'lent' ? 'You lent' : 'You borrowed'}
          </Text>
          <ThemedText style={styles.iouPerson}>{iou.personName}</ThemedText>
        </View>
        <Text style={[styles.iouAmount, { color: Colors[colorScheme ?? 'light'].text }]}>
          {formatCurrencyAmount(iou.amount)}
        </Text>
      </View>
      
      {iou.note && <ThemedText style={styles.iouNote}>{iou.note}</ThemedText>}
      
      <View style={styles.iouFooter}>
        <ThemedText style={styles.iouDate}>
          {formatDate(new Date(iou.date), dateFormat)}
        </ThemedText>
        {iou.dueDate && (
          <ThemedText style={styles.iouDueDate}>
            Due: {formatDate(new Date(iou.dueDate), dateFormat)}
          </ThemedText>
        )}
        <TouchableOpacity
          style={styles.settleButton}
          onPress={() => handleSettleIOU(iou)}
        >
          <Text style={styles.settleButtonText}>Settle</Text>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Dashboard</ThemedText>
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.summaryContainer}>
          <SummaryCard
            title="Amount Owed to You"
            amount={summary.totalOwed}
            color={Colors[colorScheme ?? 'light'].tint}
          />
          <SummaryCard
            title="Amount You Owe"
            amount={summary.totalOwing}
            color="#FF6B6B"
          />
          <SummaryCard
            title="Net Balance"
            amount={summary.netBalance}
            color={summary.netBalance >= 0 ? '#4CAF50' : '#FF6B6B'}
          />
        </View>

        {/* Ad banner for free version */}
        <AdBanner />

        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <ThemedText style={styles.sectionTitle}>Active Transactions</ThemedText>
            <ThemedText style={styles.sectionCount}>({(filteredIOUs.length > 0 ? filteredIOUs : ious).length})</ThemedText>
          </View>
          {hasProFeature(ProFeature.CUSTOM_CATEGORIES) && categories.length > 0 && (
            <TouchableOpacity
              style={styles.categoryFilterButton}
              onPress={() => setShowCategoryFilter(true)}
            >
              <View style={styles.categoryFilterContent}>
                {selectedCategory && (
                  <View style={[styles.categoryDot, { backgroundColor: selectedCategory.color }]} />
                )}
                <Text style={styles.categoryFilterText}>
                  {selectedCategory ? selectedCategory.name : 'All Categories'}
                </Text>
                <IconSymbol name="chevron.down" size={16} color={Colors[colorScheme ?? 'light'].text} />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {ious.length === 0 ? (
          <ThemedView style={styles.emptyContainer}>
            <IconSymbol name="plus.circle" size={64} color={Colors[colorScheme ?? 'light'].tabIconDefault} />
            <ThemedText style={styles.emptyText}>No active transactions</ThemedText>
            <ThemedText style={styles.emptySubText}>Tap the + button to add your first transaction</ThemedText>
          </ThemedView>
        ) : (
          (filteredIOUs.length > 0 ? filteredIOUs : ious).map(iou => <IOUItem key={iou.id} iou={iou} />)
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: '#ff8181ff' }]}
        onPress={() => setShowActionModal(true)}
      >
        <IconSymbol name="plus" size={24} color="white" />
      </TouchableOpacity>

      {/* Action Modal */}
      <Modal
        visible={showActionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowActionModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <ThemedView style={styles.modalContent}>
              <ThemedText style={styles.modalTitle}>Add Transaction</ThemedText>
              
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}
                onPress={() => handleAddTransaction('lent')}
              >
                <IconSymbol name="arrow.up.circle.fill" size={24} color="black" />
                <Text style={[styles.modalButtonText, { color: 'black' }]}>I Lent Money</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#FF6B6B' }]}
                onPress={() => handleAddTransaction('borrowed')}
              >
                <IconSymbol name="arrow.down.circle.fill" size={24} color="white" />
                <Text style={styles.modalButtonText}>I Borrowed Money</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowActionModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </ThemedView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Category Filter Modal */}
      <Modal
        visible={showCategoryFilter}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryFilter(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryFilter(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <ThemedView style={styles.modalContent}>
              <ThemedText style={styles.modalTitle}>Filter by Category</ThemedText>
              
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: !selectedCategory ? "#ff8181ff" : '#ff8181ff' }]}
                onPress={() => handleCategoryFilter(null)}
              >
                <Text style={[styles.modalButtonText, { color: !selectedCategory ? 'white' : Colors[colorScheme ?? 'light'].text }]}>
                  All Categories
                </Text>
              </TouchableOpacity>
              
              {categories.map(category => (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.modalButton, { 
                    backgroundColor: selectedCategory?.id === category.id ? Colors[colorScheme ?? 'light'].tint : '#f0f0f0' 
                  }, { borderColor: selectedCategory?.id === category.id ? '#ff6b6b' : '#f0f0f0' }, {borderWidth: 2}]}
                  onPress={() => handleCategoryFilter(category)}
                >
                  <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                  <Text style={[styles.modalButtonText, { 
                    color: selectedCategory?.id === category.id ? '#ff6b6b' : 'black' 
                  }]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCategoryFilter(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </ThemedView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  scrollView: {
    flex: 1,
  },
  summaryContainer: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  summaryCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  summaryTitle: {
    fontSize: 14,
    opacity: 0.6,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  sectionCount: {
    fontSize: 16,
    opacity: 0.6,
    marginLeft: 8,
  },
  iouItem: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  iouHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  iouInfo: {
    flex: 1,
  },
  iouType: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  iouPerson: {
    fontSize: 16,
    fontWeight: '600',
  },
  iouAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  iouNote: {
    fontSize: 14,
    fontStyle: 'italic',
    opacity: 0.7,
    marginBottom: 8,
  },
  iouFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  iouDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  iouDueDate: {
    fontSize: 12,
    opacity: 0.6,
    color: '#FF6B6B',
  },
  settleButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  settleButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubText: {
    marginTop: 8,
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 24,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    justifyContent: 'flex-start',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  cancelButton: {
    marginTop: 8,
    padding: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    opacity: 1,
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  sectionTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  categoryFilterContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryFilterText: {
    fontSize: 12,
    color: '#007AFF',
    marginRight: 4,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
});
