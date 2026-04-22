import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrainingDayCard, type TrainingDay } from '../../components/TrainingDayCard';
import { aggregateMuscleCountsFromExercises } from '../../components/MuscleHighlightBody';
import { useExecutionList } from '../../hooks/query/useExecution';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { data: executions = [], isLoading } = useExecutionList();

  const trainingDays = useMemo<TrainingDay[]>(() => {
    return executions.map((execution) => {
      const date = execution.startedAt
        ? new Date(execution.startedAt)
        : new Date(execution.createAt);
      const key = date.toISOString().slice(0, 10);

      return {
        id: String(execution.id),
        dateLabel: date.toLocaleDateString(),
        execution,
        aggregatedMuscles: aggregateMuscleCountsFromExercises(execution.exercises ?? []),
      };
    });
  }, [executions]);

  const renderItem = ({ item }: { item: TrainingDay }) => (
    <Link
      href={{
        pathname: '/training-details',
        params: {
          id: String(item.execution.id),
          dateLabel: item.dateLabel,
        },
      }}
      asChild
    >
      <Pressable>
        <TrainingDayCard day={item} compact />
      </Pressable>
    </Link>
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Loading history...</Text>
        </View>
      ) : trainingDays.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="calendar-outline" size={64} color="#666" />
          <Text style={styles.emptyText}>No training days yet.</Text>
          <Text style={styles.emptySubtext}>
            Start a training from the Home tab to begin tracking your history.
          </Text>
        </View>
      ) : (
        <FlatList
          data={trainingDays}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContainer, { paddingBottom: Math.max(insets.bottom + 16, 100) }]}
        />
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
  },
});
