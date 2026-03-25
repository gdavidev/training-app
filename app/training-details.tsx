import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { ExecutionExercise } from '../entities/ExecutionExercise';
import { useExecutionById } from '../hooks/query/useExecution';
import { aggregateMuscleCountsFromExercises, MuscleHighlightBody, type MuscleCount } from '../components/MuscleHighlightBody';

export default function TrainingDetailsScreen() {
  const { id, dateLabel } = useLocalSearchParams<{ id?: string; dateLabel?: string }>();
  const executionId = id ? Number(id) : 0;
  const { data: execution, isLoading } = useExecutionById(executionId);

  const aggregatedMuscles = useMemo<MuscleCount[]>(() => {
    if (!execution?.exercises) return [];
    return aggregateMuscleCountsFromExercises(execution.exercises);
  }, [execution]);

  const renderItem = ({ item }: { item: ExecutionExercise }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.cardInfo}>
          <View style={styles.cardHeader}>
            <Text style={styles.exerciseName}>
              {item.exercise?.name ?? 'Exercise'}
            </Text>
          </View>
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Weight</Text>
              <Text style={styles.statValue}>{item.weight} kg</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Sets</Text>
              <Text style={styles.statValue}>{item.completedSets ?? '-'}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Reps</Text>
              <Text style={styles.statValue}>{item.exercise?.reps ?? '-'}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  const headerDateLabel =
    dateLabel ||
    (execution?.startedAt
      ? new Date(execution.startedAt).toLocaleDateString()
      : undefined);

  const exercises = execution?.exercises ?? [];

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Loading training...</Text>
        </View>
      ) : exercises.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="barbell-outline" size={64} color="#666" />
          <Text style={styles.emptyText}>No exercises in this training.</Text>
          <Text style={styles.emptySubtext}>Add an exercise from the main screen.</Text>
        </View>
      ) : (
        <View style={styles.listWrapper}>
          {headerDateLabel && (
            <View style={styles.trainingHeader}>
              <Text style={styles.trainingDate}>{headerDateLabel}</Text>
              <Text style={styles.trainingSubtitle}>
                {execution?.preset?.name ? `${execution.preset.name} · ` : ''}
                {exercises.length} {exercises.length === 1 ? 'exercise' : 'exercises'}
              </Text>
            </View>
          )}

          {aggregatedMuscles.length > 0 && (
            <View style={styles.overallBodyContainer}>
              <Text style={styles.overallBodyLabel}>Training overview</Text>
              <View style={styles.overallBodyRow}>
                <MuscleHighlightBody muscles={aggregatedMuscles} scale={0.55} />
              </View>
            </View>
          )}

          <FlatList
            data={exercises}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
          />
        </View>
      )}
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
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  listWrapper: {
    flex: 1,
  },
  trainingHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  trainingDate: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  trainingSubtitle: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
  },
  cardInfo: {
    flex: 1,
  },
  overallBodyContainer: {
    paddingTop: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  overallBodyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 24,
  },
  overallBodyLabel: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exerciseName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 12,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    color: '#4dabf7',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
