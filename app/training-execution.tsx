import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Vibration,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExercisePicker } from '../components/ExercisePicker';
import { Exercise } from '../entities/Exercise';
import { ExecutionExercise } from '../entities/ExecutionExercise';
import { ExecutionCardioExercise } from '../entities/ExecutionCardioExercise';
import {
  useCurrentExecution,
  useExecutionComplete,
} from '../hooks/query/useExecution';
import {
  useExecutionExerciseToggleCompleted,
  useExecutionExerciseIncrementSets,
  useExecutionExerciseDecrementSets,
  useExecutionExerciseUpdate,
  useExecutionExerciseCreate,
  useExecutionExerciseDelete,
  useExecutionExerciseSwitchExercise,
  useLastWeightsMap,
} from '../hooks/query/useExecutionExercise';
import {
  useExecutionCardioExerciseCreate,
  useExecutionCardioExerciseToggleCompleted,
  useExecutionCardioExerciseUpdate,
  useExecutionCardioExerciseDelete,
  useExecutionCardioExerciseSwitchExercise,
} from '../hooks/query/useExecutionCardioExercise';

type MenuTarget =
  | { type: 'exercise'; item: ExecutionExercise }
  | { type: 'cardio'; item: ExecutionCardioExercise };

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function parseTimeInput(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    const m = parseInt(parts[0], 10);
    const s = parseInt(parts[1] ?? '0', 10);
    if (isNaN(m) || isNaN(s)) return null;
    return Math.max(0, m * 60 + s);
  }
  const n = parseInt(trimmed, 10);
  return isNaN(n) ? null : Math.max(0, n);
}

export default function TrainingExecutionScreen() {
  const router = useRouter();
  const { data: execution, refetch } = useCurrentExecution();
  const completeExecution = useExecutionComplete();
  const toggleCompleted = useExecutionExerciseToggleCompleted();
  const incrementSets = useExecutionExerciseIncrementSets();
  const decrementSets = useExecutionExerciseDecrementSets();
  const updateExercise = useExecutionExerciseUpdate();
  const createExecutionExercise = useExecutionExerciseCreate();
  const deleteExecutionExercise = useExecutionExerciseDelete();
  const createExecutionCardio = useExecutionCardioExerciseCreate();
  const deleteExecutionCardio = useExecutionCardioExerciseDelete();
  const switchExecutionCardio = useExecutionCardioExerciseSwitchExercise();
  const switchExecutionExercise = useExecutionExerciseSwitchExercise();
  const toggleCardioCompleted = useExecutionCardioExerciseToggleCompleted();
  const updateCardioExercise = useExecutionCardioExerciseUpdate();
  const { data: lastWeights } = useLastWeightsMap();

  const insets = useSafeAreaInsets();

  // UI display: exerciseId -> seconds remaining (recomputed from endTimes on each tick)
  const [restTimers, setRestTimers] = useState<Record<number, number>>({});
  // Absolute end timestamps for background-safe timing: exerciseId -> Unix ms
  const restTimerEndTimes = useRef<Record<number, number>>({});
  const restIntervalRefs = useRef<Record<number, ReturnType<typeof setInterval>>>({});
  // Scheduled notification identifiers for cancellation
  const restNotificationIds = useRef<Record<number, string>>({});

  // Per-exercise cardio timers: exerciseId -> elapsed seconds
  const [cardioTimers, setCardioTimers] = useState<Record<number, number>>({});
  const cardioIntervalRefs = useRef<Record<number, ReturnType<typeof setInterval>>>({});

  const [showAddModal, setShowAddModal] = useState(false);
  const [menuTarget, setMenuTarget] = useState<MenuTarget | null>(null);
  const [switchTarget, setSwitchTarget] = useState<MenuTarget | null>(null);

  // Request notification permissions once on mount
  useEffect(() => {
    Notifications.requestPermissionsAsync().catch(() => {});
  }, []);

  // Cleanup intervals on unmount and cancel any pending notifications
  useEffect(() => {
    return () => {
      Object.values(restIntervalRefs.current).forEach(clearInterval);
      Object.values(cardioIntervalRefs.current).forEach(clearInterval);
      Object.values(restNotificationIds.current).forEach((id) =>
        Notifications.cancelScheduledNotificationAsync(id).catch(() => {}),
      );
    };
  }, []);

  // When returning from background, recalculate remaining time from absolute end timestamps
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      for (const [idStr, endTime] of Object.entries(restTimerEndTimes.current)) {
        const exerciseId = Number(idStr);
        const remaining = Math.ceil((endTime - Date.now()) / 1000);
        if (remaining <= 0) {
          if (restIntervalRefs.current[exerciseId]) {
            clearInterval(restIntervalRefs.current[exerciseId]);
            delete restIntervalRefs.current[exerciseId];
          }
          delete restTimerEndTimes.current[exerciseId];
          const notifId = restNotificationIds.current[exerciseId];
          if (notifId) {
            Notifications.cancelScheduledNotificationAsync(notifId).catch(() => {});
            delete restNotificationIds.current[exerciseId];
          }
          setRestTimers((prev) => { const next = { ...prev }; delete next[exerciseId]; return next; });
          Vibration.vibrate(500);
          incrementSets.mutate(exerciseId, { onSuccess: () => refetch() });
        } else {
          setRestTimers((prev) => ({ ...prev, [exerciseId]: remaining }));
        }
      }
    });
    return () => subscription.remove();
  }, []);

  const cancelRestTimer = (exerciseId: number) => {
    if (restIntervalRefs.current[exerciseId]) {
      clearInterval(restIntervalRefs.current[exerciseId]);
      delete restIntervalRefs.current[exerciseId];
    }
    delete restTimerEndTimes.current[exerciseId];
    const notifId = restNotificationIds.current[exerciseId];
    if (notifId) {
      Notifications.cancelScheduledNotificationAsync(notifId).catch(() => {});
      delete restNotificationIds.current[exerciseId];
    }
    setRestTimers((prev) => { const next = { ...prev }; delete next[exerciseId]; return next; });
  };

  const startTimer = (exerciseId: number, restSeconds: number, exerciseName: string, isLastSet: boolean) => {
    if (restIntervalRefs.current[exerciseId]) {
      cancelRestTimer(exerciseId);
      decrementSets.mutate(exerciseId, { onSuccess: () => refetch() });
      return;
    }

    incrementSets.mutate(exerciseId, { onSuccess: () => refetch() });

    if (isLastSet) return;

    const endTime = Date.now() + restSeconds * 1000;
    restTimerEndTimes.current[exerciseId] = endTime;
    setRestTimers((prev) => ({ ...prev, [exerciseId]: restSeconds }));

    Notifications.scheduleNotificationAsync({
      content: {
        title: 'Rest complete!',
        body: `Time to start your next set of ${exerciseName}`,
        ...(Platform.OS === 'ios' ? { sound: true } : {}),
        ...(Platform.OS === 'android' ? { channelId: 'rest-timer' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: restSeconds,
      },
    })
      .then((id) => { restNotificationIds.current[exerciseId] = id; })
      .catch(() => {});

    restIntervalRefs.current[exerciseId] = setInterval(() => {
      const remaining = Math.ceil((restTimerEndTimes.current[exerciseId] - Date.now()) / 1000);
      if (remaining <= 0) {
        if (restIntervalRefs.current[exerciseId]) {
          clearInterval(restIntervalRefs.current[exerciseId]);
          delete restIntervalRefs.current[exerciseId];
        }
        delete restTimerEndTimes.current[exerciseId];
        const notifId = restNotificationIds.current[exerciseId];
        if (notifId) {
          Notifications.cancelScheduledNotificationAsync(notifId).catch(() => {});
          delete restNotificationIds.current[exerciseId];
        }
        setRestTimers((prev) => { const next = { ...prev }; delete next[exerciseId]; return next; });
        Vibration.vibrate(500);
      } else {
        setRestTimers((prev) => ({ ...prev, [exerciseId]: remaining }));
      }
    }, 1000);
  };

  const skipTimer = (exerciseId: number) => {
    cancelRestTimer(exerciseId);
  };

  const startCardioTimer = (itemId: number, startFrom: number) => {
    if (cardioIntervalRefs.current[itemId]) {
      clearInterval(cardioIntervalRefs.current[itemId]);
      delete cardioIntervalRefs.current[itemId];
      const currentElapsed = cardioTimers[itemId] ?? startFrom;
      setCardioTimers((prev) => { const next = { ...prev }; delete next[itemId]; return next; });
      updateCardioExercise.mutate(
        { id: itemId, elapsedSeconds: currentElapsed },
        { onSuccess: () => refetch() },
      );
      return;
    }

    let elapsed = startFrom;
    setCardioTimers((prev) => ({ ...prev, [itemId]: elapsed }));

    cardioIntervalRefs.current[itemId] = setInterval(() => {
      elapsed += 1;
      setCardioTimers((prev) => ({ ...prev, [itemId]: elapsed }));
    }, 1000);
  };

  const stopCardioTimer = (itemId: number) => {
    if (cardioIntervalRefs.current[itemId]) {
      clearInterval(cardioIntervalRefs.current[itemId]);
      delete cardioIntervalRefs.current[itemId];
    }
    const currentElapsed = cardioTimers[itemId] ?? 0;
    setCardioTimers((prev) => { const next = { ...prev }; delete next[itemId]; return next; });
    updateCardioExercise.mutate(
      { id: itemId, elapsedSeconds: currentElapsed, completed: true },
      { onSuccess: () => refetch() },
    );
  };

  const handleDeleteExercise = (item: ExecutionExercise) => {
    Alert.alert(
      'Remove exercise',
      `Remove "${item.exercise?.name ?? 'this exercise'}" from the session?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => deleteExecutionExercise.mutate(item.id, { onSuccess: () => refetch() }),
        },
      ],
    );
  };

  const handleDeleteCardio = (item: ExecutionCardioExercise) => {
    Alert.alert(
      'Remove exercise',
      `Remove "${item.cardioExercise?.name ?? 'this exercise'}" from the session?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => deleteExecutionCardio.mutate(item.id, { onSuccess: () => refetch() }),
        },
      ],
    );
  };

  const handleMenuRemove = () => {
    if (!menuTarget) return;
    const target = menuTarget;
    setMenuTarget(null);
    if (target.type === 'exercise') {
      handleDeleteExercise(target.item as ExecutionExercise);
    } else {
      handleDeleteCardio(target.item as ExecutionCardioExercise);
    }
  };

  const handleMenuSwitch = () => {
    const target = menuTarget;
    setMenuTarget(null);
    setSwitchTarget(target);
  };

  const handleSwitchWithExercise = async (exercise: Exercise) => {
    if (!execution || !switchTarget) return;
    try {
      if (switchTarget.type === 'exercise') {
        // Update the existing record in place so it keeps its position in the list
        await switchExecutionExercise.mutateAsync({
          id: (switchTarget.item as ExecutionExercise).id,
          newExerciseId: exercise.id,
          weight: lastWeights?.get(exercise.id) ?? '0',
        });
      } else {
        // Cross-type: delete cardio entry, create a new strength entry
        await deleteExecutionCardio.mutateAsync((switchTarget.item as ExecutionCardioExercise).id);
        await createExecutionExercise.mutateAsync({
          execution: { id: execution.id } as any,
          exercise: { id: exercise.id } as any,
          weight: lastWeights?.get(exercise.id) ?? '0',
          completed: false,
          completedSets: 0,
        } as any);
      }
      await refetch();
    } finally {
      setSwitchTarget(null);
    }
  };

  const handleSwitchWithCardio = async (cardioExerciseId: number) => {
    if (!execution || !switchTarget) return;
    try {
      if (switchTarget.type === 'cardio') {
        // Update the existing record in place so it keeps its position in the list
        await switchExecutionCardio.mutateAsync({
          id: (switchTarget.item as ExecutionCardioExercise).id,
          newCardioExerciseId: cardioExerciseId,
        });
      } else {
        // Cross-type: delete strength entry, create a new cardio entry
        await deleteExecutionExercise.mutateAsync((switchTarget.item as ExecutionExercise).id);
        await createExecutionCardio.mutateAsync({
          execution: { id: execution.id } as any,
          cardioExercise: { id: cardioExerciseId } as any,
          completed: false,
          elapsedSeconds: 0,
        } as any);
      }
      await refetch();
    } finally {
      setSwitchTarget(null);
    }
  };

  const handleFinishTraining = () => {
    if (!execution) return;

    const exercisesCompleted = execution.exercises.every((ex) => ex.completed);
    const cardioCompleted = (execution.cardioExercises ?? []).every((ce) => ce.completed);
    const allCompleted = exercisesCompleted && cardioCompleted;

    const doFinish = async () => {
      const flushPromises = Object.entries(cardioTimers).map(([idStr, elapsedSeconds]) => {
        const id = Number(idStr);
        if (cardioIntervalRefs.current[id]) {
          clearInterval(cardioIntervalRefs.current[id]);
          delete cardioIntervalRefs.current[id];
        }
        return updateCardioExercise.mutateAsync({ id, elapsedSeconds });
      });
      setCardioTimers({});
      await Promise.all(flushPromises);
      await completeExecution.mutateAsync(execution.id);
      router.replace({ pathname: '/training-summary', params: { executionId: String(execution.id) } });
    };

    if (!allCompleted) {
      Alert.alert(
        'Incomplete exercises',
        'Some exercises are not marked as completed. Finish training anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Finish', style: 'destructive', onPress: doFinish },
        ],
      );
    } else {
      doFinish();
    }
  };

  const allExercises = execution?.exercises ?? [];
  const cardioExercises = execution?.cardioExercises ?? [];

  const activeStrengthExercises = allExercises.filter((ex) => !ex.completed);
  const completedStrengthExercises = allExercises.filter((ex) => ex.completed);
  const activeCardioExercises = cardioExercises.filter((ce) => !ce.completed);
  const completedCardioExercises = cardioExercises.filter((ce) => ce.completed);
  const hasDoneSection = completedStrengthExercises.length > 0 || completedCardioExercises.length > 0;

  const completedCount =
    (allExercises.filter((ex) => ex.completed).length) +
    cardioExercises.filter((ce) => ce.completed).length;
  const totalCount = allExercises.length + cardioExercises.length;

  const alreadyAddedIds = new Set(
    allExercises.map((ee) => (ee.exercise as any)?.id).filter(Boolean),
  );

  const alreadyAddedCardioIds = new Set(
    cardioExercises.map((ce) => (ce.cardioExercise as any)?.id).filter(Boolean),
  );

  const pickerExcludeExerciseIds = switchTarget?.type === 'exercise'
    ? new Set([...alreadyAddedIds].filter((id) => id !== (switchTarget.item as ExecutionExercise).exercise?.id))
    : alreadyAddedIds;

  const pickerExcludeCardioIds = switchTarget?.type === 'cardio'
    ? new Set([...alreadyAddedCardioIds].filter((id) => id !== (switchTarget.item as ExecutionCardioExercise).cardioExercise?.id))
    : alreadyAddedCardioIds;

  const handleAddExerciseToExecution = async (exercise: Exercise) => {
    if (!execution) return;

    await createExecutionExercise.mutateAsync({
      execution: { id: execution.id } as any,
      exercise: { id: exercise.id } as any,
      weight: lastWeights?.get(exercise.id) ?? '0',
      completed: false,
      completedSets: 0,
    } as any);
    await refetch();
    setShowAddModal(false);
  };

  const handleAddCardioToExecution = async (cardioExerciseId: number) => {
    if (!execution) return;
    await createExecutionCardio.mutateAsync({
      execution: { id: execution.id } as any,
      cardioExercise: { id: cardioExerciseId } as any,
      completed: false,
      elapsedSeconds: 0,
    } as any);
    await refetch();
    setShowAddModal(false);
  };

  const renderExercise = ({ item }: { item: ExecutionExercise }) => {
    const restSeconds = parseInt(item.exercise?.restTime, 10) || 60;
    const totalSets = parseInt(item.exercise?.sets, 10) || 1;
    const doneSets = item.completedSets ?? 0;
    const allSetsDone = doneSets >= totalSets;
    const isLastSet = doneSets + 1 >= totalSets;
    const isTimerActive = item.id in restTimers;
    const timerTimeLeft = restTimers[item.id] ?? 0;
    const timerProgress = isTimerActive ? timerTimeLeft / restSeconds : 0;

    return (
      <View style={[styles.card, item.completed && styles.cardCompleted]}>
        <View style={styles.cardHeader}>
          <Pressable
            style={[styles.checkbox, item.completed && styles.checkboxChecked]}
            hitSlop={12}
            onPress={() =>
              toggleCompleted.mutate(item.id, { onSuccess: () => refetch() })
            }
          >
            {item.completed && (
              <Ionicons name="checkmark" size={18} color="#fff" />
            )}
          </Pressable>
          <Text
            style={[
              styles.exerciseName,
              item.completed && styles.exerciseNameCompleted,
            ]}
          >
            {item.exercise?.name ?? 'Exercise'}
          </Text>
          <Pressable
            style={styles.menuButton}
            hitSlop={12}
            onPress={() => setMenuTarget({ type: 'exercise', item })}
          >
            <Ionicons name="ellipsis-vertical" size={18} color="#888" />
          </Pressable>
        </View>

        <View style={styles.statsContainer}>
          {item.exercise?.weightingMethod !== 'none' ? (
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Weight</Text>
              <View style={styles.weightInputRow}>
                <TextInput
                  style={styles.weightInput}
                  keyboardType="numeric"
                  defaultValue={String(item.weight ?? 0)}
                  onEndEditing={(e) => {
                    const val = parseFloat(e.nativeEvent.text);
                    if (!isNaN(val)) {
                      updateExercise.mutate(
                        { id: item.id, weight: String(val) },
                        { onSuccess: () => refetch() },
                      );
                    }
                  }}
                  selectTextOnFocus
                />
                <Text style={styles.weightUnit}>
                  {item.exercise?.weightingMethod === 'double' ? 'kg x2' : 'kg'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Weight</Text>
              <Text style={styles.statValue}>BW</Text>
            </View>
          )}
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Sets</Text>
            <Text style={styles.statValue}>{item.exercise?.sets ?? '-'}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>
              {item.exercise?.inputMode === 'hold' ? 'Hold' : 'Reps'}
            </Text>
            <TextInput
              style={styles.weightInput}
              defaultValue={item.exercise?.reps ?? ''}
              onEndEditing={(e) => {
                const val = e.nativeEvent.text.trim();
                if (val) {
                  updateExercise.mutate(
                    { id: item.id, completedReps: val },
                    { onSuccess: () => refetch() },
                  );
                }
              }}
              selectTextOnFocus
            />
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Rest</Text>
            <Text style={styles.statValue}>{restSeconds}s</Text>
          </View>
        </View>

        <View style={styles.setsProgressRow}>
          <Text style={styles.setsProgressLabel}>Set progress</Text>
          <View style={styles.setsProgressBarBg}>
            <View
              style={[
                styles.setsProgressBarFill,
                { width: totalSets > 0 ? `${(doneSets / totalSets) * 100}%` : '0%' },
                allSetsDone && styles.setsProgressBarDone,
              ]}
            />
          </View>
          <Text style={[styles.setsProgressText, allSetsDone && styles.setsProgressTextDone]}>
            {doneSets}/{totalSets}
          </Text>
          {doneSets > 0 && (
            <Pressable
              style={styles.undoSetButton}
              hitSlop={10}
              onPress={() => decrementSets.mutate(item.id, { onSuccess: () => refetch() })}
            >
              <Ionicons name="arrow-undo" size={14} color="#aaa" />
            </Pressable>
          )}
        </View>

        {!allSetsDone ? (
          <View style={styles.timerRow}>
            <Pressable
              style={[
                styles.timerButton,
                isTimerActive && styles.timerButtonActive,
              ]}
              onPress={() => startTimer(item.id, restSeconds, item.exercise?.name ?? 'exercise', isLastSet)}
            >
              {isTimerActive ? (
                <View style={styles.timerContent}>
                  <View style={styles.timerBarBackground}>
                    <View
                      style={[
                        styles.timerBarFill,
                        { width: `${timerProgress * 100}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.timerText}>{formatTime(timerTimeLeft)}</Text>
                  <Text style={styles.timerHint}>Tap to cancel</Text>
                </View>
              ) : isLastSet ? (
                <View style={styles.timerContent}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#51cf66" />
                  <Text style={styles.timerButtonText}>
                    Done — set {doneSets + 1}
                  </Text>
                </View>
              ) : (
                <View style={styles.timerContent}>
                  <Ionicons name="timer-outline" size={18} color="#4dabf7" />
                  <Text style={styles.timerButtonText}>
                    Rest after set {doneSets + 1} ({restSeconds}s)
                  </Text>
                </View>
              )}
            </Pressable>
            {isTimerActive && (
              <Pressable style={styles.skipButton} onPress={() => skipTimer(item.id)}>
                <Ionicons name="play-skip-forward" size={14} color="#4dabf7" />
                <Text style={styles.skipButtonText}>Skip</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={styles.allSetsDoneBadge}>
            <Ionicons name="checkmark-circle" size={18} color="#51cf66" />
            <Text style={styles.allSetsDoneText}>All sets completed</Text>
          </View>
        )}
      </View>
    );
  };

  const renderCardioExercise = (item: ExecutionCardioExercise) => {
    const targetDuration = item.cardioExercise?.maxDuration ?? 0;
    const isTimerActive = item.id in cardioTimers;
    const elapsed = isTimerActive ? cardioTimers[item.id] : item.elapsedSeconds;
    const progress = targetDuration > 0 ? Math.min(elapsed / targetDuration, 1) : 0;

    return (
      <View style={[styles.card, item.completed && styles.cardCompleted]}>
        <View style={styles.cardHeader}>
          <Pressable
            style={[styles.checkbox, item.completed && styles.checkboxChecked]}
            hitSlop={12}
            onPress={() =>
              toggleCardioCompleted.mutate(item.id, { onSuccess: () => refetch() })
            }
          >
            {item.completed && (
              <Ionicons name="checkmark" size={18} color="#fff" />
            )}
          </Pressable>
          <Text
            style={[
              styles.exerciseName,
              item.completed && styles.exerciseNameCompleted,
            ]}
          >
            {item.cardioExercise?.name ?? 'Cardio'}
          </Text>
          <View style={styles.cardioBadge}>
            <Ionicons name="heart" size={12} color="#ff6b6b" />
            <Text style={styles.cardioBadgeText}>Cardio</Text>
          </View>
          <Pressable
            style={styles.menuButton}
            hitSlop={12}
            onPress={() => setMenuTarget({ type: 'cardio', item })}
          >
            <Ionicons name="ellipsis-vertical" size={18} color="#888" />
          </Pressable>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Max</Text>
            <Text style={styles.statValue}>{targetDuration > 0 ? formatTime(targetDuration) : '—'}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Elapsed</Text>
            {isTimerActive ? (
              <Text style={[styles.statValue, elapsed >= targetDuration && targetDuration > 0 && { color: '#51cf66' }]}>
                {formatTime(elapsed)}
              </Text>
            ) : (
              <TextInput
                key={`elapsed-${item.id}-${item.elapsedSeconds}`}
                style={[styles.weightInput, elapsed >= targetDuration && targetDuration > 0 && { color: '#51cf66' }]}
                defaultValue={formatTime(elapsed)}
                onEndEditing={(e) => {
                  const parsed = parseTimeInput(e.nativeEvent.text);
                  if (parsed !== null && parsed !== elapsed) {
                    updateCardioExercise.mutate(
                      { id: item.id, elapsedSeconds: parsed },
                      { onSuccess: () => refetch() },
                    );
                  }
                }}
              />
            )}
          </View>
        </View>

        <View style={styles.setsProgressRow}>
          <Text style={styles.setsProgressLabel}>Duration progress</Text>
          <View style={styles.setsProgressBarBg}>
            <View
              style={[
                styles.setsProgressBarFill,
                { width: `${progress * 100}%` },
                progress >= 1 && styles.setsProgressBarDone,
              ]}
            />
          </View>
          <Text style={[styles.setsProgressText, progress >= 1 && styles.setsProgressTextDone]}>
            {Math.round(progress * 100)}%
          </Text>
        </View>

        {!item.completed ? (
          <View style={styles.timerRow}>
            <Pressable
              style={[
                styles.timerButton,
                isTimerActive && styles.timerButtonActive,
              ]}
              onPress={() => startCardioTimer(item.id, elapsed)}
            >
              {isTimerActive ? (
                <View style={styles.timerContent}>
                  <View style={styles.timerBarBackground}>
                    <View
                      style={[
                        styles.timerBarFill,
                        { width: `${progress * 100}%` },
                      ]}
                    />
                  </View>
                  <Ionicons name="pause" size={18} color="#ff6b6b" />
                  <Text style={styles.timerText}>{formatTime(cardioTimers[item.id] ?? 0)}</Text>
                  <Text style={styles.timerHint}>Tap to pause</Text>
                </View>
              ) : (
                <View style={styles.timerContent}>
                  <Ionicons name="play" size={18} color="#ff6b6b" />
                  <Text style={[styles.timerButtonText, { color: '#ff6b6b' }]}>
                    {elapsed > 0 ? 'Resume cardio' : 'Start cardio'} ({formatTime(targetDuration)})
                  </Text>
                </View>
              )}
            </Pressable>
            {isTimerActive && (
              <Pressable style={styles.skipButton} onPress={() => stopCardioTimer(item.id)}>
                <Ionicons name="checkmark-done" size={14} color="#51cf66" />
                <Text style={[styles.skipButtonText, { color: '#51cf66' }]}>Done</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={styles.allSetsDoneBadge}>
            <Ionicons name="checkmark-circle" size={18} color="#51cf66" />
            <Text style={styles.allSetsDoneText}>
              Completed in {formatTime(item.elapsedSeconds)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (!execution) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="barbell-outline" size={64} color="#666" />
        <Text style={styles.emptyText}>No active training.</Text>
        <Text style={styles.emptySubtext}>
          Start a training from the home screen.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <View style={styles.container}>
        <View style={styles.headerSection}>
          <Text style={styles.presetName}>
            {execution.preset?.name ?? 'Training'}
          </Text>
          <Text style={styles.dateLabel}>
            {execution.startedAt
              ? new Date(execution.startedAt).toLocaleDateString()
              : ''}
          </Text>
          <View style={styles.progressRow}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width:
                      totalCount > 0
                        ? `${(completedCount / totalCount) * 100}%`
                        : '0%',
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {completedCount}/{totalCount}
            </Text>
          </View>
        </View>

        <FlatList
          data={activeStrengthExercises}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderExercise}
          contentContainerStyle={styles.listContainer}
          ListFooterComponent={
            <>
              {activeCardioExercises.map((item) => (
                <React.Fragment key={`active-cardio-${item.id}`}>
                  {renderCardioExercise(item)}
                </React.Fragment>
              ))}
              {hasDoneSection && (
                <>
                  <View style={styles.doneSectionHeader}>
                    <Ionicons name="checkmark" size={16} color="#51cf66" />
                    <Text style={styles.doneSectionTitle}>Done</Text>
                  </View>
                  {completedStrengthExercises.map((item) => (
                    <React.Fragment key={`done-strength-${item.id}`}>
                      {renderExercise({ item })}
                    </React.Fragment>
                  ))}
                  {completedCardioExercises.map((item) => (
                    <React.Fragment key={`done-cardio-${item.id}`}>
                      {renderCardioExercise(item)}
                    </React.Fragment>
                  ))}
                </>
              )}
              <Pressable
                style={styles.addExerciseButton}
                onPress={() => setShowAddModal(true)}
              >
                <Ionicons name="add-circle-outline" size={20} color="#4dabf7" />
                <Text style={styles.addExerciseButtonText}>Add Exercise</Text>
              </Pressable>
            </>
          }
        />

        <ExercisePicker
          visible={showAddModal || switchTarget !== null}
          onClose={() => { setShowAddModal(false); setSwitchTarget(null); }}
          onSelectExercise={(ex) =>
            switchTarget ? handleSwitchWithExercise(ex) : handleAddExerciseToExecution(ex)
          }
          onSelectCardioExercise={(ce) =>
            switchTarget ? handleSwitchWithCardio(ce.id) : handleAddCardioToExecution(ce.id)
          }
          excludeExerciseIds={pickerExcludeExerciseIds}
          excludeCardioExerciseIds={pickerExcludeCardioIds}
        />

        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
          <Pressable style={styles.finishButton} onPress={handleFinishTraining}>
            <Ionicons name="checkmark-done" size={20} color="#fff" />
            <Text style={styles.finishButtonText}>Finish Training</Text>
          </Pressable>
        </View>
      </View>

      {/* Context menu action sheet */}
      <Modal
        transparent
        visible={menuTarget !== null}
        animationType="fade"
        onRequestClose={() => setMenuTarget(null)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setMenuTarget(null)}>
          <View style={styles.menuSheet}>
            <Pressable style={styles.menuOption} onPress={handleMenuSwitch}>
              <Ionicons name="swap-horizontal" size={20} color="#4dabf7" />
              <Text style={styles.menuOptionText}>Switch exercise</Text>
            </Pressable>
            <View style={styles.menuDivider} />
            <Pressable style={styles.menuOption} onPress={handleMenuRemove}>
              <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
              <Text style={[styles.menuOptionText, styles.menuOptionDestructive]}>Remove</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
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
  headerSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  presetName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  dateLabel: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 4,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#2a2a2a',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4dabf7',
    borderRadius: 3,
  },
  progressText: {
    color: '#4dabf7',
    fontSize: 13,
    fontWeight: '600',
    minWidth: 36,
    textAlign: 'right',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 120,
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
  cardCompleted: {
    opacity: 0.6,
    borderWidth: 1,
    borderColor: '#4dabf7',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4dabf7',
    borderColor: '#4dabf7',
  },
  exerciseName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  exerciseNameCompleted: {
    textDecorationLine: 'line-through',
    color: '#888',
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
  weightInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  weightInput: {
    color: '#4dabf7',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    minWidth: 36,
    paddingVertical: 0,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  weightUnit: {
    color: '#888',
    fontSize: 12,
  },
  setsProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  setsProgressLabel: {
    color: '#888',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  setsProgressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  setsProgressBarFill: {
    height: '100%',
    backgroundColor: '#4dabf7',
    borderRadius: 3,
  },
  setsProgressBarDone: {
    backgroundColor: '#51cf66',
  },
  setsProgressText: {
    color: '#4dabf7',
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'] as any,
    minWidth: 30,
    textAlign: 'right',
  },
  setsProgressTextDone: {
    color: '#51cf66',
  },
  allSetsDoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: 'rgba(81, 207, 102, 0.1)',
    borderRadius: 12,
    paddingVertical: 10,
  },
  allSetsDoneText: {
    color: '#51cf66',
    fontSize: 14,
    fontWeight: '600',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 12,
    gap: 8,
  },
  timerButton: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  timerButtonActive: {
    backgroundColor: '#1a3a5c',
    borderWidth: 1,
    borderColor: '#4dabf7',
  },
  timerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  timerButtonText: {
    color: '#4dabf7',
    fontSize: 14,
    fontWeight: '600',
  },
  timerText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  timerHint: {
    color: '#888',
    fontSize: 11,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(77, 171, 247, 0.15)',
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  skipButtonText: {
    color: '#4dabf7',
    fontSize: 11,
    fontWeight: '600',
  },
  timerBarBackground: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
    borderRadius: 12,
    overflow: 'hidden',
  },
  timerBarFill: {
    height: '100%',
    backgroundColor: 'rgba(77, 171, 247, 0.15)',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  finishButton: {
    backgroundColor: '#4dabf7',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  finishButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4dabf7',
    borderStyle: 'dashed',
    borderRadius: 16,
  },
  addExerciseButtonText: {
    color: '#4dabf7',
    fontSize: 15,
    fontWeight: '600',
  },
  doneSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginTop: 4,
  },
  doneSectionTitle: {
    color: '#51cf66',
    fontSize: 16,
    fontWeight: '700',
  },
  menuButton: {
    padding: 4,
    marginLeft: 4,
  },
  undoSetButton: {
    padding: 4,
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
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 8,
    paddingBottom: 32,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  menuOptionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  menuOptionDestructive: {
    color: '#ff6b6b',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#2a2a2a',
    marginHorizontal: 24,
  },
});
