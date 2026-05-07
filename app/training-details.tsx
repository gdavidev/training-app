import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { ExecutionExercise } from '../entities/ExecutionExercise';
import { ExecutionCardioExercise } from '../entities/ExecutionCardioExercise';
import { useExecutionById } from '../hooks/query/useExecution';
import { aggregateMuscleCountsFromExercises, MuscleHighlightBody, type MuscleCount } from '../components/MuscleHighlightBody';
import { ExerciseStatusBadge } from '../components/ExerciseStatusBadge';
import { getStrengthExerciseStatus, getCardioExerciseStatus } from '../utils/exerciseStatus';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function TrainingDetailsScreen() {
  const router = useRouter();
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
            <Pressable
              style={styles.exerciseNameBtn}
              onPress={() =>
                item.exercise?.id &&
                router.push({ pathname: '/exercise-detail', params: { id: String(item.exercise.id) } })
              }
            >
              <Text style={styles.exerciseName}>{item.exercise?.name ?? 'Exercise'}</Text>
              {item.exercise?.id ? (
                <Ionicons name="stats-chart-outline" size={13} color="#4dabf7" />
              ) : null}
            </Pressable>
            <ExerciseStatusBadge status={getStrengthExerciseStatus(item)} />
          </View>
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Weight</Text>
              <Text style={styles.statValue}>{item.weight} kg</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Sets done</Text>
              <Text style={styles.statValue}>{item.completedSets ?? '-'}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Reps</Text>
              <Text style={styles.statValue}>{item.completedReps || item.exercise?.reps || '-'}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  const renderCardioItem = ({ item }: { item: ExecutionCardioExercise }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.cardInfo}>
          <View style={styles.cardHeader}>
            <View style={styles.cardioNameRow}>
              <Text style={styles.exerciseName}>
                {item.cardioExercise?.name ?? 'Cardio'}
              </Text>
              <View style={styles.cardioBadge}>
                <Ionicons name="heart" size={12} color="#ff6b6b" />
                <Text style={styles.cardioBadgeText}>Cardio</Text>
              </View>
            </View>
            <ExerciseStatusBadge status={getCardioExerciseStatus(item)} />
          </View>
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Target</Text>
              <Text style={styles.statValue}>
                {formatDuration(item.cardioExercise?.duration ?? 0)}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Elapsed</Text>
              <Text style={styles.statValue}>
                {formatDuration(item.elapsedSeconds ?? 0)}
              </Text>
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
  const cardioExercises = execution?.cardioExercises ?? [];
  const totalExercises = exercises.length + cardioExercises.length;

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Loading training...</Text>
        </View>
      ) : totalExercises === 0 ? (
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
                {totalExercises} {totalExercises === 1 ? 'exercise' : 'exercises'}
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
            ListFooterComponent={
              cardioExercises.length > 0 ? (
                <>
                  <View style={styles.cardioSectionHeader}>
                    <Ionicons name="heart" size={16} color="#ff6b6b" />
                    <Text style={styles.cardioSectionTitle}>Cardio</Text>
                  </View>
                  {cardioExercises.map((ce) => (
                    <View key={`cardio-${ce.id}`}>
                      {renderCardioItem({ item: ce })}
                    </View>
                  ))}
                </>
              ) : null
            }
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
    gap: 8,
  },
  exerciseNameBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exerciseName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  cardioNameRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  cardioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cardioBadgeText: {
    color: '#ff6b6b',
    fontSize: 11,
    fontWeight: '600',
  },
  cardioSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginTop: 4,
  },
  cardioSectionTitle: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: '700',
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
