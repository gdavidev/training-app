import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function WorkoutScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Workout</Text>
        <Text style={styles.subtitle}>Manage your exercises and presets.</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.row}>
          <Pressable
            style={[styles.menuButton, { flex: 1 }]}
            onPress={() => router.push('/manage-exercises')}
          >
            <View style={styles.menuButtonLeft}>
              <Ionicons name="barbell-outline" size={22} color="#4dabf7" />
              <View style={styles.menuButtonTextGroup}>
                <Text style={styles.menuButtonLabel}>My Exercises</Text>
                <Text style={styles.menuButtonHint}>View or delete exercises</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#555" />
          </Pressable>

          <Pressable
            style={styles.addButton}
            onPress={() => router.push('/add-exercise')}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.row}>
          <Pressable
            style={[styles.menuButton, { flex: 1 }]}
            onPress={() => router.push('/manage-presets')}
          >
            <View style={styles.menuButtonLeft}>
              <Ionicons name="layers-outline" size={22} color="#4dabf7" />
              <View style={styles.menuButtonTextGroup}>
                <Text style={styles.menuButtonLabel}>My Presets</Text>
                <Text style={styles.menuButtonHint}>View or delete presets</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#555" />
          </Pressable>

          <Pressable
            style={styles.addButton}
            onPress={() => router.push('/add-preset')}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 16,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#aaa',
  },
  section: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#4dabf7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 14,
  },
  menuButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuButtonTextGroup: {
    marginLeft: 14,
  },
  menuButtonLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  menuButtonHint: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
});
