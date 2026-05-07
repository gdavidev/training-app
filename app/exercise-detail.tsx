import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Circle, Line, Path, Svg, Text as SvgText } from 'react-native-svg';
import { Exercise } from '../entities/Exercise';
import { ExecutionExercise } from '../entities/ExecutionExercise';
import { useExerciseById, useExerciseHistory } from '../hooks/query/useExercise';

type SessionData = {
  executionId: number;
  date: Date;
  weight: string | number;
  weightValue: number;
  completedSets: number;
  completed: boolean;
};

function parseWeight(weight: string | number | null | undefined): number {
  if (weight == null) return 0;
  if (typeof weight === 'number') return isNaN(weight) ? 0 : weight;
  const str = String(weight).trim();
  if (!str || str === '0') return 0;
  if (str.includes('/')) {
    const parts = str.split('/').map((p) => parseFloat(p)).filter((v) => !isNaN(v));
    return parts.length > 0 ? parts.reduce((a, b) => a + b, 0) / parts.length : 0;
  }
  return parseFloat(str) || 0;
}

function buildSessionData(history: ExecutionExercise[]): SessionData[] {
  return history.map((ee) => ({
    executionId: ee.execution.id,
    date: new Date(ee.execution.createAt),
    weight: ee.weight,
    weightValue: parseWeight(ee.weight),
    completedSets: ee.completedSets,
    completed: ee.completed,
  }));
}

function generateSuggestions(sessions: SessionData[], exercise: Exercise): string[] {
  if (sessions.length === 0) {
    return ['No sessions recorded yet. Start training to unlock insights.'];
  }

  if (sessions.length < 3) {
    return ['Complete a few more sessions to unlock performance insights.'];
  }

  const suggestions: string[] = [];
  const lastFive = sessions.slice(-5);
  const lastThree = sessions.slice(-3);

  const recentSkipCount = lastFive.filter((s) => !s.completed).length;
  if (recentSkipCount >= 2) {
    suggestions.push(
      'You\'ve been skipping this exercise frequently. Consider reducing the weight or trying a lighter variation.',
    );
  }

  const weightedRecent = lastThree.filter((s) => s.completed && s.weightValue > 0);
  if (weightedRecent.length >= 3) {
    const allSameWeight = weightedRecent.every((s) => s.weightValue === weightedRecent[0].weightValue);
    if (allSameWeight) {
      suggestions.push(
        `You've hit all sets at ${weightedRecent[0].weightValue} kg for 3 consecutive sessions — consider increasing the weight.`,
      );
    }
  }

  const allWeighted = sessions.filter((s) => s.weightValue > 0);
  if (allWeighted.length >= 3) {
    const recentThreeWeighted = allWeighted.slice(-3);
    const isProgressing =
      recentThreeWeighted[2].weightValue > recentThreeWeighted[1].weightValue &&
      recentThreeWeighted[1].weightValue > recentThreeWeighted[0].weightValue;
    if (isProgressing) {
      suggestions.push('Great work! Your load has been steadily progressing over recent sessions.');
    }

    const isDecreasing =
      recentThreeWeighted[2].weightValue < recentThreeWeighted[1].weightValue &&
      recentThreeWeighted[1].weightValue < recentThreeWeighted[0].weightValue;
    if (isDecreasing) {
      suggestions.push('Your load has been decreasing. This could be a planned deload — if not, check your form and recovery.');
    }
  }

  const completedCount = sessions.filter((s) => s.completed).length;
  if (completedCount === sessions.length && sessions.length >= 3) {
    suggestions.push('Excellent consistency — you\'ve completed every session for this exercise!');
  }

  if (sessions.every((s) => s.weightValue === 0)) {
    suggestions.push('No weight has been tracked for this exercise. Add weight to start tracking progression.');
  }

  return suggestions.length > 0
    ? suggestions
    : ['Keep training consistently to build performance insights.'];
}

const CHART_PADDING_LEFT = 42;
const CHART_PADDING_RIGHT = 16;
const CHART_PADDING_TOP = 12;
const CHART_PADDING_BOTTOM = 32;
const CHART_HEIGHT = 160;

function ProgressionChart({ sessions }: { sessions: SessionData[] }) {
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 32;
  const plotWidth = chartWidth - CHART_PADDING_LEFT - CHART_PADDING_RIGHT;
  const plotHeight = CHART_HEIGHT - CHART_PADDING_BOTTOM - CHART_PADDING_TOP;

  const withWeights = sessions.filter((s) => s.weightValue > 0);

  if (withWeights.length < 2) {
    return (
      <View style={chartStyles.emptyChart}>
        <Ionicons name="bar-chart-outline" size={32} color="#444" />
        <Text style={chartStyles.emptyChartText}>
          {withWeights.length === 0
            ? 'No weight data to display'
            : 'Need at least 2 sessions to show progression'}
        </Text>
      </View>
    );
  }

  const displaySessions = sessions.slice(-12);
  const count = displaySessions.length;

  const weights = displaySessions.map((s) => s.weightValue).filter((w) => w > 0);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;

  const yPad = range * 0.15;
  const yMin = Math.max(0, minW - yPad);
  const yMax = maxW + yPad;
  const yRange = yMax - yMin || 1;

  const getX = (i: number) =>
    CHART_PADDING_LEFT + (count > 1 ? (i / (count - 1)) * plotWidth : plotWidth / 2);
  const getY = (w: number) =>
    CHART_PADDING_TOP + plotHeight - ((w - yMin) / yRange) * plotHeight;

  const points = displaySessions.map((s, i) => ({
    x: getX(i),
    y: s.weightValue > 0 ? getY(s.weightValue) : null,
    completed: s.completed,
    weight: s.weightValue,
    date: s.date,
  }));

  const lineParts: string[] = [];
  let inSegment = false;
  points.forEach((p) => {
    if (p.y !== null) {
      if (!inSegment) {
        lineParts.push(`M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
        inSegment = true;
      } else {
        lineParts.push(`L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
      }
    } else {
      inSegment = false;
    }
  });
  const pathD = lineParts.join(' ');

  const yTicks = [yMin, yMin + yRange / 2, yMax].map((v) => ({
    value: v,
    y: getY(v),
    label: v.toFixed(1),
  }));

  const xLabels = displaySessions.map((s, i) => {
    const showEvery = count <= 6 ? 1 : count <= 9 ? 2 : 3;
    if (i % showEvery !== 0 && i !== count - 1) return null;
    const d = s.date;
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    return { x: getX(i), label };
  });

  return (
    <Svg width={chartWidth} height={CHART_HEIGHT}>
      {yTicks.map((tick, i) => (
        <React.Fragment key={i}>
          <Line
            x1={CHART_PADDING_LEFT}
            y1={tick.y}
            x2={chartWidth - CHART_PADDING_RIGHT}
            y2={tick.y}
            stroke="#2a2a2a"
            strokeWidth={1}
          />
          <SvgText
            x={CHART_PADDING_LEFT - 6}
            y={tick.y + 4}
            fill="#666"
            fontSize={10}
            textAnchor="end"
          >
            {tick.label}
          </SvgText>
        </React.Fragment>
      ))}

      {xLabels.map((label, i) =>
        label ? (
          <SvgText
            key={i}
            x={label.x}
            y={CHART_HEIGHT - 6}
            fill="#666"
            fontSize={10}
            textAnchor="middle"
          >
            {label.label}
          </SvgText>
        ) : null,
      )}

      {pathD ? (
        <Path d={pathD} stroke="#4dabf7" strokeWidth={2} fill="none" strokeLinejoin="round" />
      ) : null}

      {points.map((p, i) =>
        p.y !== null ? (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4}
            fill={p.completed ? '#4dabf7' : '#ff4444'}
            stroke="#121212"
            strokeWidth={1.5}
          />
        ) : null,
      )}
    </Svg>
  );
}

const chartStyles = StyleSheet.create({
  emptyChart: {
    height: CHART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyChartText: {
    color: '#555',
    fontSize: 13,
    textAlign: 'center',
  },
});

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const exerciseId = id ? Number(id) : 0;

  const { data: exercise, isLoading: loadingExercise } = useExerciseById(exerciseId);
  const { data: rawHistory = [], isLoading: loadingHistory } = useExerciseHistory(exerciseId);

  const sessions = useMemo(() => buildSessionData(rawHistory), [rawHistory]);

  const stats = useMemo(() => {
    const total = sessions.length;
    const completed = sessions.filter((s) => s.completed).length;
    const skipped = total - completed;
    return { total, completed, skipped };
  }, [sessions]);

  const suggestions = useMemo(() => {
    if (!exercise) return [];
    return generateSuggestions(sessions, exercise);
  }, [sessions, exercise]);

  const isLoading = loadingExercise || loadingHistory;

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!exercise) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color="#666" />
        <Text style={styles.emptyText}>Exercise not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.exerciseName}>{exercise.name}</Text>
        <View style={styles.metaRow}>
          {exercise.sets ? (
            <View style={styles.badge}>
              <Ionicons name="layers-outline" size={13} color="#4dabf7" />
              <Text style={styles.badgeText}>{exercise.sets} sets × {exercise.reps || '?'} reps</Text>
            </View>
          ) : null}
          {exercise.muscles && exercise.muscles.length > 0 ? (
            <View style={styles.badge}>
              <Ionicons name="body-outline" size={13} color="#aaa" />
              <Text style={[styles.badgeText, { color: '#aaa' }]}>
                {exercise.muscles.map((m) => m.key).join(', ')}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#69db7c' }]}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#ff6b6b' }]}>{stats.skipped}</Text>
          <Text style={styles.statLabel}>Skipped</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Load Progression</Text>
        {sessions.length === 0 ? (
          <View style={chartStyles.emptyChart}>
            <Ionicons name="bar-chart-outline" size={32} color="#444" />
            <Text style={chartStyles.emptyChartText}>No sessions recorded yet</Text>
          </View>
        ) : (
          <>
            <ProgressionChart sessions={sessions} />
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#4dabf7' }]} />
                <Text style={styles.legendText}>Completed</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#ff4444' }]} />
                <Text style={styles.legendText}>Skipped</Text>
              </View>
            </View>
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Suggestions</Text>
        {suggestions.map((tip, i) => (
          <View key={i} style={styles.suggestionCard}>
            <Ionicons name="bulb-outline" size={18} color="#ffd43b" style={styles.suggestionIcon} />
            <Text style={styles.suggestionText}>{tip}</Text>
          </View>
        ))}
      </View>

      {sessions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Session History</Text>
          {sessions
            .slice()
            .reverse()
            .slice(0, 10)
            .map((s, i) => (
              <View key={i} style={styles.historyRow}>
                <View style={styles.historyDot}>
                  <View
                    style={[
                      styles.historyDotInner,
                      { backgroundColor: s.completed ? '#4dabf7' : '#ff4444' },
                    ]}
                  />
                </View>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyDate}>
                    {s.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                  <Text style={styles.historyMeta}>
                    {s.weightValue > 0 ? `${String(s.weight)} kg` : 'No weight'} · {s.completedSets} sets ·{' '}
                    <Text style={{ color: s.completed ? '#69db7c' : '#ff6b6b' }}>
                      {s.completed ? 'Completed' : 'Skipped'}
                    </Text>
                  </Text>
                </View>
              </View>
            ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#aaa',
    fontSize: 16,
  },
  emptyText: {
    color: '#aaa',
    fontSize: 16,
  },
  headerCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },
  exerciseName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#2a2a2a',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  badgeText: {
    color: '#4dabf7',
    fontSize: 13,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: '#666',
    fontSize: 12,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#252525',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  suggestionIcon: {
    marginTop: 1,
  },
  suggestionText: {
    flex: 1,
    color: '#ddd',
    fontSize: 14,
    lineHeight: 20,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  historyDot: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  historyInfo: {
    flex: 1,
  },
  historyDate: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  historyMeta: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
});
