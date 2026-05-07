import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useExecutionById, usePreviousExecutionForPreset } from '../hooks/query/useExecution';
import { usePresetById, usePresetUpdate } from '../hooks/query/usePreset';

export default function TrainingSummaryScreen() {
  const { executionId } = useLocalSearchParams<{ executionId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [presetUpdated, setPresetUpdated] = useState(false);

  const execId = executionId ? Number(executionId) : 0;
  const { data: execution, isLoading } = useExecutionById(execId);
  const presetId = execution?.preset?.id;
  const { data: preset } = usePresetById(presetId ?? 0);
  const { data: previousExecution } = usePreviousExecutionForPreset(presetId, execId);
  const updatePreset = usePresetUpdate();

  const comparison = useMemo(() => {
    if (!execution) return null;

    const currentExMap = new Map(
      execution.exercises.map((e) => [e.exercise?.id, e]),
    );
    const prevExMap = previousExecution
      ? new Map(previousExecution.exercises.map((e) => [e.exercise?.id, e]))
      : new Map<number, typeof previousExecution.exercises[0]>();

    // Weight deltas for exercises present in both sessions
    const weightDeltas: Array<{
      exerciseId: number;
      name: string;
      currentWeight: number;
      previousWeight: number;
      delta: number;
      weightingMethod: string;
    }> = [];

    for (const [exId, currEx] of currentExMap) {
      if (!exId || currEx.exercise?.weightingMethod === 'none') continue;
      const prevEx = prevExMap.get(exId);
      if (prevEx) {
        const curr = parseFloat(String(currEx.weight)) || 0;
        const prev = parseFloat(String(prevEx.weight)) || 0;
        weightDeltas.push({
          exerciseId: exId,
          name: currEx.exercise?.name ?? 'Exercise',
          currentWeight: curr,
          previousWeight: prev,
          delta: curr - prev,
          weightingMethod: currEx.exercise?.weightingMethod ?? 'single',
        });
      }
    }

    // Exercises only in previous (no longer in current session)
    const removedVsPrevious = previousExecution
      ? previousExecution.exercises.filter(
          (e) => e.exercise?.id && !currentExMap.has(e.exercise.id),
        )
      : [];

    // Exercises only in current (new vs previous session)
    const addedVsPrevious = execution.exercises.filter(
      (e) => e.exercise?.id && !prevExMap.has(e.exercise.id),
    );

    // Exercises removed mid-session: in the preset but not in the current execution
    const presetExerciseIds = new Set(
      (preset?.exercises ?? []).map((pe) => pe.exercise?.id).filter(Boolean),
    );
    const removedMidSession = [...presetExerciseIds]
      .filter((id) => id && !currentExMap.has(id))
      .map((id) => {
        const pe = (preset?.exercises ?? []).find((e) => e.exercise?.id === id);
        return pe?.exercise?.name ?? 'Exercise';
      });

    // Completion stats
    const cardioExercises = execution.cardioExercises ?? [];
    const completedCount =
      execution.exercises.filter((e) => e.completed).length +
      cardioExercises.filter((c) => c.completed).length;
    const totalCount = execution.exercises.length + cardioExercises.length;
    const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

    // Detect whether the preset is out of sync with this execution
    const presetCardioIds = new Set(
      (preset?.cardioExercises ?? []).map((pce) => pce.cardioExercise?.id).filter(Boolean),
    );
    const execCardioIds = new Set(
      (execution.cardioExercises ?? []).map((c) => c.cardioExercise?.id).filter(Boolean),
    );
    const presetOutOfSync =
      [...currentExMap.keys()].some((id) => id && !presetExerciseIds.has(id)) ||
      [...presetExerciseIds].some((id) => id && !currentExMap.has(id)) ||
      [...execCardioIds].some((id) => id && !presetCardioIds.has(id)) ||
      [...presetCardioIds].some((id) => id && !execCardioIds.has(id));

    return {
      weightDeltas,
      addedVsPrevious,
      removedVsPrevious,
      removedMidSession,
      completedCount,
      totalCount,
      completionPct,
      hasPrevious: !!previousExecution,
      presetOutOfSync,
    };
  }, [execution, previousExecution, preset]);

  const handleDone = () => {
    router.replace('/(tabs)');
  };

  const handleUpdatePreset = async () => {
    if (!preset || !execution) return;
    const items = [
      ...execution.exercises
        .filter((e) => e.exercise?.id)
        .map((e) => ({ kind: 'strength' as const, id: e.exercise.id })),
      ...(execution.cardioExercises ?? [])
        .filter((c) => c.cardioExercise?.id)
        .map((c) => ({ kind: 'cardio' as const, id: c.cardioExercise.id })),
    ];
    await updatePreset.mutateAsync({ id: preset.id, name: preset.name, items });
    setPresetUpdated(true);
  };

  if (isLoading || !execution) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#4dabf7" />
      </View>
    );
  }

  const durationMin = execution.startedAt
    ? Math.round((Date.now() - new Date(execution.startedAt).getTime()) / 60000)
    : null;

  // Build switch pairs: pair removed vs added 1:1 when both are present
  const removedCount = comparison?.removedVsPrevious.length ?? 0;
  const addedCount = comparison?.addedVsPrevious.length ?? 0;
  const switchPairCount = Math.min(removedCount, addedCount);
  const switchPairs = comparison
    ? comparison.removedVsPrevious.slice(0, switchPairCount).map((removed, i) => ({
        oldName: removed.exercise?.name ?? 'Exercise',
        newName: comparison.addedVsPrevious[i]?.exercise?.name ?? 'Exercise',
      }))
    : [];
  const extraRemoved = comparison?.removedVsPrevious.slice(switchPairCount) ?? [];
  const extraAdded = comparison?.addedVsPrevious.slice(switchPairCount) ?? [];

  const hasChanges =
    comparison &&
    (comparison.removedMidSession.length > 0 ||
      comparison.addedVsPrevious.length > 0 ||
      comparison.removedVsPrevious.length > 0);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 80 },
        ]}
      >
        {/* Hero */}
        <View style={styles.heroSection}>
          <View style={styles.trophyCircle}>
            <Ionicons name="trophy" size={40} color="#ffd43b" />
          </View>
          <Text style={styles.heroTitle}>Workout Complete!</Text>
          <Text style={styles.heroPreset}>{execution.preset?.name ?? 'Training'}</Text>
          <View style={styles.heroMeta}>
            {durationMin !== null && durationMin > 0 && (
              <View style={styles.heroBadge}>
                <Ionicons name="time-outline" size={13} color="#aaa" />
                <Text style={styles.heroBadgeText}>{durationMin} min</Text>
              </View>
            )}
            <View style={[styles.heroBadge, styles.heroBadgeSaved]}>
              <Ionicons name="checkmark-circle" size={13} color="#51cf66" />
              <Text style={[styles.heroBadgeText, styles.heroBadgeTextSaved]}>Saved</Text>
            </View>
          </View>
        </View>

        {/* Completion score */}
        {comparison && (
          <View style={styles.scoreCard}>
            <View style={styles.scoreLeft}>
              <Text
                style={[
                  styles.scoreNumber,
                  comparison.completionPct < 100 && styles.scoreNumberPartial,
                ]}
              >
                {comparison.completionPct}%
              </Text>
              <Text style={styles.scoreLabel}>completion</Text>
            </View>
            <View style={styles.scoreDivider} />
            <View style={styles.scoreRight}>
              <View style={styles.scoreStat}>
                <Text style={styles.scoreStatValue}>{comparison.completedCount}</Text>
                <Text style={styles.scoreStatLabel}>done</Text>
              </View>
              <Text style={styles.scoreSlash}>/</Text>
              <View style={styles.scoreStat}>
                <Text style={styles.scoreStatValue}>{comparison.totalCount}</Text>
                <Text style={styles.scoreStatLabel}>total</Text>
              </View>
            </View>
          </View>
        )}

        {/* Weight comparison vs previous session */}
        {comparison?.hasPrevious && comparison.weightDeltas.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Performance vs Last Session</Text>
            {comparison.weightDeltas.map((d) => {
              const unit = d.weightingMethod === 'double' ? 'kg×2' : 'kg';
              return (
                <View key={d.exerciseId} style={styles.deltaRow}>
                  <Text style={styles.deltaName} numberOfLines={1}>
                    {d.name}
                  </Text>
                  <View style={styles.deltaValues}>
                    <Text style={styles.deltaPrev}>
                      {d.previousWeight} {unit}
                    </Text>
                    <Ionicons
                      name={
                        d.delta > 0
                          ? 'arrow-up'
                          : d.delta < 0
                          ? 'arrow-down'
                          : 'remove'
                      }
                      size={14}
                      color={d.delta > 0 ? '#51cf66' : d.delta < 0 ? '#ff6b6b' : '#555'}
                      style={styles.deltaArrow}
                    />
                    <Text
                      style={[
                        styles.deltaCurr,
                        d.delta > 0 && styles.deltaPositive,
                        d.delta < 0 && styles.deltaNegative,
                      ]}
                    >
                      {d.currentWeight} {unit}
                    </Text>
                    {d.delta !== 0 && (
                      <View
                        style={[
                          styles.deltaBadge,
                          d.delta > 0 ? styles.deltaBadgePositive : styles.deltaBadgeNegative,
                        ]}
                      >
                        <Text
                          style={[
                            styles.deltaBadgeText,
                            d.delta > 0 ? styles.deltaPositive : styles.deltaNegative,
                          ]}
                        >
                          {d.delta > 0 ? '+' : ''}
                          {d.delta % 1 === 0 ? d.delta.toFixed(0) : d.delta.toFixed(1)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* First session note */}
        {comparison && !comparison.hasPrevious && (
          <View style={styles.firstSessionNote}>
            <Ionicons name="flag" size={18} color="#4dabf7" />
            <Text style={styles.firstSessionText}>
              First time running this preset — no previous data to compare against.
            </Text>
          </View>
        )}

        {/* Update preset */}
        {comparison?.presetOutOfSync && (
          <View style={styles.section}>
            <View style={styles.updatePresetHeader}>
              <Ionicons name="sync-outline" size={18} color="#4dabf7" />
              <Text style={styles.sectionTitle}>Update Preset</Text>
            </View>
            <Text style={styles.updatePresetDesc}>
              This session's exercise list differs from your preset. Sync the preset to match what you actually did today.
            </Text>
            {presetUpdated ? (
              <View style={styles.updatePresetDone}>
                <Ionicons name="checkmark-circle" size={18} color="#51cf66" />
                <Text style={styles.updatePresetDoneText}>Preset updated</Text>
              </View>
            ) : (
              <Pressable
                style={[styles.updatePresetButton, updatePreset.isPending && styles.updatePresetButtonDisabled]}
                onPress={handleUpdatePreset}
                disabled={updatePreset.isPending}
              >
                {updatePreset.isPending ? (
                  <ActivityIndicator size="small" color="#4dabf7" />
                ) : (
                  <Ionicons name="sync" size={16} color="#4dabf7" />
                )}
                <Text style={styles.updatePresetButtonText}>
                  {updatePreset.isPending ? 'Updating…' : `Sync "${preset?.name ?? 'Preset'}"`}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Session changes */}
        {hasChanges && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Session Changes</Text>

            {comparison.removedMidSession.length > 0 && (
              <View style={styles.changeGroup}>
                <Text style={styles.changeGroupLabel}>Removed mid-session</Text>
                {comparison.removedMidSession.map((name, i) => (
                  <View key={i} style={styles.changeRow}>
                    <Ionicons name="remove-circle" size={16} color="#ff6b6b" />
                    <Text style={styles.changeText}>{name}</Text>
                  </View>
                ))}
              </View>
            )}

            {comparison.hasPrevious && switchPairs.length > 0 && (
              <View style={styles.changeGroup}>
                <Text style={styles.changeGroupLabel}>Exercises switched</Text>
                {switchPairs.map((pair, i) => (
                  <View key={i} style={styles.switchRow}>
                    <Text style={styles.switchOld}>{pair.oldName}</Text>
                    <Ionicons name="arrow-forward" size={14} color="#888" />
                    <Text style={styles.switchNew}>{pair.newName}</Text>
                  </View>
                ))}
              </View>
            )}

            {comparison.hasPrevious && extraRemoved.length > 0 && (
              <View style={styles.changeGroup}>
                <Text style={styles.changeGroupLabel}>No longer in session</Text>
                {extraRemoved.map((e, i) => (
                  <View key={i} style={styles.changeRow}>
                    <Ionicons name="remove-circle" size={16} color="#ff6b6b" />
                    <Text style={styles.changeText}>{e.exercise?.name}</Text>
                  </View>
                ))}
              </View>
            )}

            {comparison.hasPrevious && extraAdded.length > 0 && (
              <View style={styles.changeGroup}>
                <Text style={styles.changeGroupLabel}>Added this session</Text>
                {extraAdded.map((e, i) => (
                  <View key={i} style={styles.changeRow}>
                    <Ionicons name="add-circle" size={16} color="#51cf66" />
                    <Text style={styles.changeText}>{e.exercise?.name}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
        <Pressable style={styles.doneButton} onPress={handleDone}>
          <Ionicons name="checkmark-done" size={20} color="#fff" />
          <Text style={styles.doneButtonText}>Done</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  trophyCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 212, 59, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  heroPreset: {
    color: '#aaa',
    fontSize: 16,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1e1e1e',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  heroBadgeSaved: {
    backgroundColor: 'rgba(81, 207, 102, 0.12)',
  },
  heroBadgeText: {
    color: '#aaa',
    fontSize: 13,
  },
  heroBadgeTextSaved: {
    color: '#51cf66',
  },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    gap: 16,
  },
  scoreLeft: {
    alignItems: 'center',
    flex: 1,
  },
  scoreNumber: {
    color: '#51cf66',
    fontSize: 40,
    fontWeight: 'bold',
    lineHeight: 44,
  },
  scoreNumberPartial: {
    color: '#ffd43b',
  },
  scoreLabel: {
    color: '#888',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  scoreDivider: {
    width: 1,
    height: 48,
    backgroundColor: '#2a2a2a',
  },
  scoreRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  scoreStat: {
    alignItems: 'center',
  },
  scoreStatValue: {
    color: '#4dabf7',
    fontSize: 24,
    fontWeight: 'bold',
  },
  scoreStatLabel: {
    color: '#888',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreSlash: {
    color: '#555',
    fontSize: 24,
    fontWeight: '300',
    marginBottom: 12,
  },
  section: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
    gap: 8,
  },
  deltaName: {
    color: '#ddd',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  deltaValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deltaPrev: {
    color: '#666',
    fontSize: 13,
    minWidth: 52,
    textAlign: 'right',
  },
  deltaArrow: {
    marginHorizontal: 2,
  },
  deltaCurr: {
    color: '#ccc',
    fontSize: 13,
    fontWeight: '600',
    minWidth: 52,
  },
  deltaPositive: {
    color: '#51cf66',
  },
  deltaNegative: {
    color: '#ff6b6b',
  },
  deltaBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    minWidth: 36,
    alignItems: 'center',
  },
  deltaBadgePositive: {
    backgroundColor: 'rgba(81, 207, 102, 0.15)',
  },
  deltaBadgeNegative: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
  },
  deltaBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  firstSessionNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(77, 171, 247, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  firstSessionText: {
    color: '#4dabf7',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  changeGroup: {
    marginBottom: 12,
  },
  changeGroupLabel: {
    color: '#888',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  changeText: {
    color: '#ccc',
    fontSize: 14,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  switchOld: {
    color: '#ff6b6b',
    fontSize: 14,
    flex: 1,
  },
  switchNew: {
    color: '#51cf66',
    fontSize: 14,
    flex: 1,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  doneButton: {
    backgroundColor: '#4dabf7',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  updatePresetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  updatePresetDesc: {
    color: '#888',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  updatePresetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#4dabf7',
    borderRadius: 10,
    paddingVertical: 12,
  },
  updatePresetButtonDisabled: {
    opacity: 0.5,
  },
  updatePresetButtonText: {
    color: '#4dabf7',
    fontSize: 15,
    fontWeight: '600',
  },
  updatePresetDone: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: 'rgba(81, 207, 102, 0.1)',
    borderRadius: 10,
  },
  updatePresetDoneText: {
    color: '#51cf66',
    fontSize: 15,
    fontWeight: '600',
  },
});
