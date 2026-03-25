import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import TrainingSelectionScreen from '../../components/TrainingSelection';
import WeekTracker from '../../components/WeekTracker';

export default function HomeScreen() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNavigate = (type: 'preset' | 'exercise') => {
    setMenuOpen(false);

    if (type === 'exercise') {
      router.push('/add-exercise');
      return;
    }

    if (type === 'preset') {
      router.push('/add-preset');
      return;
    }
  };

  return (
    <View style={styles.root}>
      <WeekTracker />

      <TrainingSelectionScreen />

      <View style={styles.fabOverlay} pointerEvents="box-none">
        <View style={styles.fabWrapper}>
          {menuOpen && (
            <View style={styles.menu}>
              <Pressable
                style={styles.menuItem}
                onPress={() => handleNavigate('preset')}
              >
                <Text style={styles.menuItemLabel}>Add preset</Text>
              </Pressable>
              <Pressable
                style={styles.menuItem}
                onPress={() => handleNavigate('exercise')}
              >
                <Text style={styles.menuItemLabel}>Add exercise</Text>
              </Pressable>
            </View>
          )}

          <Pressable
            style={styles.fab}
            onPress={() => setMenuOpen((open) => !open)}
          >
            <Ionicons
              name={menuOpen ? 'close' : 'add'}
              size={26}
              color="#fff"
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#121212',
  },
  fabOverlay: {
    position: 'absolute',
    left: 24,
    bottom: 32,
    right: 24,
  },
  fabWrapper: {
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4dabf7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  menu: {
    marginBottom: 12,
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  menuItem: {
    paddingVertical: 8,
  },
  menuItemLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});
