import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Execution } from '../entities/Execution';
import { MuscleHighlightBody, type MuscleCount } from './MuscleHighlightBody';

export type TrainingDay = {
  id: string;
  dateLabel: string;
  execution: Execution;
  aggregatedMuscles: MuscleCount[];
};

type Props = {
  day: TrainingDay;
  compact?: boolean;
};

export function TrainingDayCard({ day, compact }: Props) {
  const exerciseCount = day.execution.exercises?.length ?? 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.dateText}>{day.dateLabel}</Text>
          <Text style={styles.subtitleText}>
            {day.execution.preset?.name ?? 'Training'} · {exerciseCount}{' '}
            {exerciseCount === 1 ? 'exercise' : 'exercises'}
          </Text>
        </View>
        <Ionicons name="calendar-outline" size={22} color="#4dabf7" />
      </View>

      {!compact && day.aggregatedMuscles.length > 0 && (
        <View style={styles.bodyRow}>
          <MuscleHighlightBody muscles={day.aggregatedMuscles} scale={0.6} />
        </View>
      )}

      <View style={styles.exerciseList}>
        {(day.execution.exercises ?? []).map((ee) => (
          <View key={ee.id} style={styles.exerciseRow}>
            <Text style={styles.exerciseName}>{ee.exercise?.name ?? 'Exercise'}</Text>
            <Text style={styles.exerciseMeta}>
              {ee.weight} kg · {ee.exercise?.sets ?? '-'} x {ee.exercise?.reps ?? '-'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitleText: {
    color: '#aaa',
    fontSize: 13,
    marginTop: 2,
  },
  bodyRow: {
    marginBottom: 12,
  },
  exerciseList: {
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
    paddingTop: 10,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  exerciseName: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  exerciseMeta: {
    color: '#888',
    fontSize: 12,
  },
});
