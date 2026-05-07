import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Exercise } from '../entities/Exercise';
import { CardioExercise } from '../entities/CardioExercise';
import { useExerciseList, useExerciseDelete } from '../hooks/query/useExercise';
import { useCardioExerciseList, useCardioExerciseDelete } from '../hooks/query/useCardioExercise';

type ExerciseTab = 'strength' | 'cardio';

type ListItem =
  | { type: 'strength'; data: Exercise }
  | { type: 'cardio'; data: CardioExercise };

export default function ManageExercisesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: exercises = [], isLoading: loadingEx } = useExerciseList();
  const { data: cardioExercises = [], isLoading: loadingCardio } = useCardioExerciseList();
  const deleteExercise = useExerciseDelete();
  const deleteCardioExercise = useCardioExerciseDelete();
  const [activeTab, setActiveTab] = useState<ExerciseTab>('strength');

  const isLoading = loadingEx || loadingCardio;

  const handleDelete = (exercise: Exercise) => {
    Alert.alert('Delete exercise?', `Remove "${exercise.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteExercise.mutate(exercise.id),
      },
    ]);
  };

  const handleDeleteCardio = (exercise: CardioExercise) => {
    Alert.alert('Delete cardio exercise?', `Remove "${exercise.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteCardioExercise.mutate(exercise.id),
      },
    ]);
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const listData: ListItem[] =
    activeTab === 'strength'
      ? exercises.map((e) => ({ type: 'strength' as const, data: e }))
      : cardioExercises.map((e) => ({ type: 'cardio' as const, data: e }));

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'cardio') {
      const ce = item.data;
      return (
        <Pressable
          style={styles.card}
          onPress={() => router.push({ pathname: '/add-exercise', params: { editCardioId: String(ce.id) } })}
        >
          <View style={styles.cardContent}>
            <View style={styles.cardInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.exerciseName}>{ce.name}</Text>
                <View style={styles.cardioBadge}>
                  <Ionicons name="heart" size={10} color="#ff6b6b" />
                </View>
              </View>
              <Text style={[styles.exerciseMeta, { color: '#ff6b6b' }]}>
                {formatDuration(ce.maxDuration)} duration
              </Text>
            </View>
            <Pressable onPress={() => handleDeleteCardio(ce)} hitSlop={10} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={20} color="#ff4444" />
            </Pressable>
          </View>
        </Pressable>
      );
    }

    const ex = item.data as Exercise;
    return (
      <Pressable
        style={styles.card}
        onPress={() => router.push({ pathname: '/add-exercise', params: { editId: String(ex.id) } })}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardInfo}>
            <Text style={styles.exerciseName}>{ex.name}</Text>
            <Text style={styles.exerciseMeta}>
              {ex.sets} sets x {ex.reps} reps
            </Text>
            {ex.muscles && ex.muscles.length > 0 && (
              <Text style={styles.musclesText}>
                {ex.muscles.map(m => m.key).join(', ')}
              </Text>
            )}
          </View>
          <View style={styles.cardActions}>
            <Pressable
              onPress={() => router.push({ pathname: '/exercise-detail', params: { id: String(ex.id) } })}
              hitSlop={10}
              style={styles.actionBtn}
            >
              <Ionicons name="stats-chart-outline" size={20} color="#4dabf7" />
            </Pressable>
            <Pressable onPress={() => handleDelete(ex)} hitSlop={10} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={20} color="#ff4444" />
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  };

  const totalExercises = exercises.length + cardioExercises.length;

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, activeTab === 'strength' && styles.tabActiveStrength]}
          onPress={() => setActiveTab('strength')}
        >
          <Ionicons name="barbell-outline" size={18} color={activeTab === 'strength' ? '#4dabf7' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'strength' && styles.tabTextActiveStrength]}>
            Strength
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'cardio' && styles.tabActiveCardio]}
          onPress={() => setActiveTab('cardio')}
        >
          <Ionicons name="heart-outline" size={18} color={activeTab === 'cardio' ? '#ff6b6b' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'cardio' && styles.tabTextActiveCardio]}>
            Cardio
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Loading exercises...</Text>
        </View>
      ) : totalExercises === 0 ? (
        <View style={styles.center}>
          <Ionicons name="barbell-outline" size={64} color="#666" />
          <Text style={styles.emptyText}>No exercises yet.</Text>
          <Text style={styles.emptySubtext}>
            Create your first exercise to get started.
          </Text>
        </View>
      ) : listData.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name={activeTab === 'strength' ? 'barbell-outline' : 'heart-outline'} size={64} color="#666" />
          <Text style={styles.emptyText}>No {activeTab} exercises yet.</Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => `${item.type}-${item.data.id}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />
      )}

      <Pressable style={[styles.fab, { bottom: insets.bottom + 16 }]} onPress={() => router.push('/add-exercise')}>
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#333',
  },
  tabActiveStrength: {
    backgroundColor: '#1a2633',
    borderColor: '#4dabf7',
  },
  tabActiveCardio: {
    backgroundColor: '#2a1a1a',
    borderColor: '#ff6b6b',
  },
  tabText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '600',
  },
  tabTextActiveStrength: {
    color: '#4dabf7',
  },
  tabTextActiveCardio: {
    color: '#ff6b6b',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  exerciseName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  exerciseMeta: {
    color: '#aaa',
    fontSize: 13,
    marginTop: 4,
  },
  musclesText: {
    color: '#4dabf7',
    fontSize: 12,
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    padding: 8,
  },
  deleteBtn: {
    padding: 8,
  },
  cardioBadge: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    padding: 3,
    borderRadius: 6,
  },
  fab: {
    position: 'absolute',
    right: 24,
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
});
