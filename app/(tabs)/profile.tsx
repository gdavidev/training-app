import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppDataSource } from '../../data-source';
import { Exercise } from '../../entities/Exercise';
import { Execution } from '../../entities/Execution';
import { ExecutionExercise } from '../../entities/ExecutionExercise';
import { Preset } from '../../entities/Preset';
import { PresetExercise } from '../../entities/PresetExercise';
import { Muscle } from '../../entities/Muscle';
import { queryClient } from '../../hooks/query/queryClient';

export default function ProfileScreen() {
  const router = useRouter();

  const handleEraseHistory = () => {
    Alert.alert(
      'Erase history?',
      'This will permanently delete all execution history on this device. Exercises and presets will be kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase',
          style: 'destructive',
          onPress: async () => {
            try {
              await AppDataSource.getRepository(ExecutionExercise).clear();
              await AppDataSource.getRepository(Execution).clear();
              queryClient.invalidateQueries();
            } catch (error) {
              console.error('Failed to erase history', error);
              Alert.alert('Error', 'Failed to erase history.');
            }
          },
        },
      ],
    );
  };

  const handleEraseStorage = () => {
    Alert.alert(
      'Erase all data?',
      'This will permanently delete all saved workouts, presets and execution history on this device. This is intended for debugging.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase',
          style: 'destructive',
          onPress: async () => {
            try {
              await AppDataSource.getRepository(ExecutionExercise).clear();
              await AppDataSource.getRepository(Execution).clear();
              await AppDataSource.getRepository(PresetExercise).clear();
              await AppDataSource.getRepository(Preset).clear();
              await AppDataSource.getRepository(Exercise).clear();
              await AppDataSource.getRepository(Muscle).clear();
              queryClient.invalidateQueries();
            } catch (error) {
              console.error('Failed to erase data', error);
              Alert.alert('Error', 'Failed to erase data.');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>
          Manage your exercises, presets and app data.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Workouts</Text>

        <Pressable
          style={styles.menuButton}
          onPress={() => router.push('/manage-exercises')}
        >
          <View style={styles.menuButtonLeft}>
            <Ionicons name="barbell-outline" size={22} color="#4dabf7" />
            <View style={styles.menuButtonTextGroup}>
              <Text style={styles.menuButtonLabel}>My Exercises</Text>
              <Text style={styles.menuButtonHint}>View, add or delete exercises</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#555" />
        </Pressable>

        <Pressable
          style={styles.menuButton}
          onPress={() => router.push('/manage-presets')}
        >
          <View style={styles.menuButtonLeft}>
            <Ionicons name="layers-outline" size={22} color="#4dabf7" />
            <View style={styles.menuButtonTextGroup}>
              <Text style={styles.menuButtonLabel}>My Presets</Text>
              <Text style={styles.menuButtonHint}>View, add or delete presets</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#555" />
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>

        <Pressable style={styles.eraseHistoryButton} onPress={handleEraseHistory}>
          <Ionicons name="time-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.eraseButtonText}>Erase history</Text>
        </Pressable>

        <Text style={styles.helperText}>
          Deletes all execution history. Exercises and presets are kept.
        </Text>

        <Pressable style={[styles.eraseButton, { marginTop: 14 }]} onPress={handleEraseStorage}>
          <Ionicons name="trash-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.eraseButtonText}>Erase all stored data</Text>
        </Pressable>

        <Text style={styles.helperText}>
          This only affects data stored on this device. It cannot be undone.
        </Text>
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
  section: {
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
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#777',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
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
  eraseHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#c66900',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  eraseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#b00020',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  eraseButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  helperText: {
    marginTop: 10,
    fontSize: 12,
    color: '#777',
  },
});
