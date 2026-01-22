import { usePathname, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import PagerView from 'react-native-pager-view';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from 'react-i18next';

// Import all tab screens
import CalculadoraScreen from './calculadora';
import CalendarioScreen from './calendario';
import DashboardScreen from './dashboard';
import FichajeScreen from './fichaje';
import PerfilScreen from './perfil';
import SolicitudesScreen from './solicitudes';

export default function TabLayout() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const pathname = usePathname();
  const pagerRef = useRef<PagerView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // Tab configuration
  const tabs = [
    { name: 'fichaje', title: t('fichaje.title'), icon: 'house.fill', component: FichajeScreen },
    { name: 'dashboard', title: 'Dashboard', icon: 'chart.bar.fill', component: DashboardScreen },
    { name: 'calendario', title: t('calendario.title'), icon: 'calendar', component: CalendarioScreen },
    { name: 'calculadora', title: t('calculadora.title'), icon: 'number.square.fill', component: CalculadoraScreen },
    { name: 'solicitudes', title: t('solicitudes.title'), icon: 'doc.text.fill', component: SolicitudesScreen },
    { name: 'perfil', title: t('perfil.title'), icon: 'person.fill', component: PerfilScreen },
  ];

  // Sync current page with URL
  useEffect(() => {
    const currentTabIndex = tabs.findIndex(tab => pathname?.includes(tab.name));
    if (currentTabIndex !== -1 && currentTabIndex !== currentPage) {
      setCurrentPage(currentTabIndex);
      pagerRef.current?.setPage(currentTabIndex);
    }
  }, [pathname]);

  // Handle page change from swipe (only update state, don't navigate)
  const handlePageSelected = (e: any) => {
    const newPage = e.nativeEvent.position;
    if (newPage !== currentPage) {
      setCurrentPage(newPage);
    }
  };

  // Handle page scroll for immediate visual feedback (faster icon switching)
  const handlePageScroll = (e: any) => {
    const { position, offset } = e.nativeEvent;
    // Switch icon when we're 30% of the way to next page (faster feedback)
    // This only updates local state, NOT the URL, so no infinite loop
    const threshold = 0.3;

    if (offset < threshold && position !== currentPage) {
      setCurrentPage(position);
    } else if (offset >= threshold && position < tabs.length - 1 && position + 1 !== currentPage) {
      setCurrentPage(position + 1);
    }
  };

  // Handle tab bar press (use PagerView animation for smooth transition)
  const handleTabPress = (index: number) => {
    // Use PagerView's setPage for smooth animation
    pagerRef.current?.setPage(index);
  };

  return (
    <View style={styles.container}>
      <PagerView
        ref={pagerRef}
        style={styles.pagerView}
        initialPage={currentPage}
        onPageSelected={handlePageSelected}
        onPageScroll={handlePageScroll}
      >
        {tabs.map((tab, index) => (
          <View key={tab.name} style={styles.page}>
            <tab.component />
          </View>
        ))}
      </PagerView>

      {/* Custom Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
        {tabs.map((tab, index) => (
          <HapticTab
            key={tab.name}
            style={styles.tabButton}
            onPress={() => handleTabPress(index)}
          >
            <View style={styles.tabContent}>
              <IconSymbol
                size={30}
                name={tab.icon as any}
                color={currentPage === index ? Colors[colorScheme ?? 'light'].tint : Colors[colorScheme ?? 'light'].tabIconDefault}
              />
            </View>
          </HapticTab>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pagerView: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: 70,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
  },
});
