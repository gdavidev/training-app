import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Vibration,
} from 'react-native';
import { ExecutionExercise } from '../entities/ExecutionExercise';
import { ExecutionCardioExercise } from '../entities/ExecutionCardioExercise';
import {
  useCurrentExecution,
  useExecutionComplete,
} from '../hooks/query/useExecution';
import {
  useExecutionExerciseToggleCompleted,
  useExecutionExerciseIncrementSets,
  useExecutionExerciseUpdate,
  useExecutionExerciseCreate,
  useLastWeightsMap,
} from '../hooks/query/useExecutionExercise';
import {
  useExecutionCardioExerciseCreate,
  useExecutionCardioExerciseToggleCompleted,
  useExecutionCardioExerciseUpdate,
} from '../hooks/query/useExecutionCardioExercise';
import { useExerciseList } from '../hooks/query/useExercise';
import { useCardioExerciseList } from '../hooks/query/useCardioExercise';

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function TrainingExecutionScreen() {
  const router = useRouter();
  const { data: execution, refetch } = useCurrentExecution();
  const completeExecution = useExecutionComplete();
  const toggleCompleted = useExecutionExerciseToggleCompleted();
  const incrementSets = useExecutionExerciseIncrementSets();
  const updateExercise = useExecutionExerciseUpdate();
  const createExecutionExercise = useExecutionExerciseCreate();
  const createExecutionCardio = useExecutionCardioExerciseCreate();
  const toggleCardioCompleted = useExecutionCardioExerciseToggleCompleted();
  const updateCardioExercise = useExecutionCardioExerciseUpdate();
  const { data: allExercises = [] } = useExerciseList();
  const { data: allCardioExercises = [] } = useCardioExerciseList();
  const { data: lastWeights } = useLastWeightsMap();

  const [activeTimerId, setActiveTimerId] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [addModalTab, setAddModalTab] = useState<'exercise' | 'cardio'>('exercise');

  const [activeCardioTimerId, setActiveCardioTimerId] = useState<number | null>(null);
  const [cardioElapsed, setCardioElapsed] = useState(0);
  const cardioIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (cardioIntervalRef.current) clearInterval(cardioIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (timeLeft <= 0 && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      if (activeTimerId) {
        Vibration.vibrate(500);
        incrementSets.mutate(activeTimerId, {
          onSuccess: () => refetch(),
        });
        setActiveTimerId(null);
      }
    }
  }, [timeLeft, activeTimerId]);

  const startTimer = (exerciseId: number, restSeconds: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (activeTimerId === exerciseId) {
      setActiveTimerId(null);
      setTimeLeft(0);
      return;
    }

    setActiveTimerId(exerciseId);
    setTimeLeft(restSeconds);

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
  };

  const skipTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    if (activeTimerId) {
      incrementSets.mutate(activeTimerId, {
        onSuccess: () => refetch(),
      });
    }
    setActiveTimerId(null);
    setTimeLeft(0);
  };

  const startCardioTimer = (itemId: number, startFrom: number) => {
    if (cardioIntervalRef.current) clearInterval(cardioIntervalRef.current);

    if (activeCardioTimerId === itemId) {
      updateCardioExercise.mutate(
        { id: itemId, elapsedSeconds: cardioElapsed },
        { onSuccess: () => refetch() },
      );
      setActiveCardioTimerId(null);
      setCardioElapsed(0);
      return;
    }

    setActiveCardioTimerId(itemId);
    setCardioElapsed(startFrom);

    cardioIntervalRef.current = setInterval(() => {
      setCardioElapsed((prev) => prev + 1);
    }, 1000);
  };

  const stopCardioTimer = (itemId: number) => {
    if (cardioIntervalRef.current) clearInterval(cardioIntervalRef.current);
    cardioIntervalRef.current = null;
    updateCardioExercise.mutate(
      { id: itemId, elapsedSeconds: cardioElapsed, completed: true },
      { onSuccess: () => refetch() },
    );
    setActiveCardioTimerId(null);
    setCardioElapsed(0);
  };

  const handleFinishTraining = () => {
    if (!execution) return;

    const exercisesCompleted = execution.exercises.every((ex) => ex.completed);
    const cardioCompleted = (execution.cardioExercises ?? []).every((ce) => ce.completed);
    const allCompleted = exercisesCompleted && cardioCompleted;

    const doFinish = async () => {
      await completeExecution.mutateAsync(execution.id);
      router.back();
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

  const alreadyAddedIds = new Set(
    execution?.exercises.map((ee) => (ee.exercise as any)?.id).filter(Boolean),
  );
  const filteredExercises = allExercises.filter((ex) => {
    if (alreadyAddedIds.has(ex.id)) return false;
    if (!exerciseSearch.trim()) return true;
    return ex.name.toLowerCase().includes(exerciseSearch.toLowerCase());
  });

  const alreadyAddedCardioIds = new Set(
    (execution?.cardioExercises ?? []).map((ce) => (ce.cardioExercise as any)?.id).filter(Boolean),
  );
  const filteredCardioExercises = allCardioExercises.filter((ce) => {
    if (alreadyAddedCardioIds.has(ce.id)) return false;
    if (!exerciseSearch.trim()) return true;
    return ce.name.toLowerCase().includes(exerciseSearch.toLowerCase());
  });

  const handleAddExerciseToExecution = async (exerciseId: number) => {
    if (!execution) return;
    const exercise = allExercises.find((e) => e.id === exerciseId);
    if (!exercise) return;

    await createExecutionExercise.mutateAsync({
      execution: { id: execution.id } as any,
      exercise: { id: exercise.id } as any,
      weight: lastWeights?.get(exercise.id) ?? '0',
      completed: false,
      completedSets: 0,
    } as any);
    await refetch();
    setShowAddModal(false);
    setExerciseSearch('');
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
    setExerciseSearch('');
  };

  const cardioExercises = execution?.cardioExercises ?? [];
  const completedCount =
    (execution?.exercises.filter((ex) => ex.completed).length ?? 0) +
    cardioExercises.filter((ce) => ce.completed).length;
  const totalCount = (execution?.exercises.length ?? 0) + cardioExercises.length;

  const renderExercise = ({ item }: { item: ExecutionExercise }) => {
    const restSeconds = parseInt(item.exercise?.restTime, 10) || 60;
    const totalSets = parseInt(item.exercise?.sets, 10) || 1;
    const doneSets = item.completedSets ?? 0;
    const allSetsDone = doneSets >= totalSets;
    const isTimerActive = activeTimerId === item.id;
    const timerProgress = isTimerActive ? timeLeft / restSeconds : 0;

    return (
      <View style={[styles.card, item.completed && styles.cardCompleted]}>
        <View style={styles.cardHeader}>
          <Pressable
            style={[styles.checkbox, item.completed && styles.checkboxChecked]}
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
        </View>

        <View style={styles.statsContainer}>
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
              <Text style={styles.weightUnit}>kg</Text>
            </View>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Sets</Text>
            <Text style={styles.statValue}>{item.exercise?.sets ?? '-'}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Reps</Text>
            <Text style={styles.statValue}>{item.exercise?.reps ?? '-'}</Text>
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
        </View>

        {!allSetsDone ? (
          <View style={styles.timerRow}>
            <Pressable
              style={[
                styles.timerButton,
                isTimerActive && styles.timerButtonActive,
              ]}
              onPress={() => startTimer(item.id, restSeconds)}
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
                  <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
                  <Text style={styles.timerHint}>Tap to cancel</Text>
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
              <Pressable style={styles.skipButton} onPress={skipTimer}>
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
    const targetDuration = item.cardioExercise?.duration ?? 0;
    const isTimerActive = activeCardioTimerId === item.id;
    const elapsed = isTimerActive ? cardioElapsed : item.elapsedSeconds;
    const progress = targetDuration > 0 ? Math.min(elapsed / targetDuration, 1) : 0;

    return (
      <View key={`cardio-${item.id}`} style={[styles.card, item.completed && styles.cardCompleted]}>
        <View style={styles.cardHeader}>
          <Pressable
            style={[styles.checkbox, item.completed && styles.checkboxChecked]}
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
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Target</Text>
            <Text style={styles.statValue}>{formatTime(targetDuration)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Elapsed</Text>
            <Text style={[styles.statValue, elapsed >= targetDuration && targetDuration > 0 && { color: '#51cf66' }]}>
              {formatTime(elapsed)}
            </Text>
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
                  <Text style={styles.timerText}>{formatTime(cardioElapsed)}</Text>
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
        data={execution.exercises}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderExercise}
        contentContainerStyle={styles.listContainer}
        ListFooterComponent={
          <>
            {cardioExercises.length > 0 && (
              <View style={styles.cardioSectionHeader}>
                <Ionicons name="heart" size={16} color="#ff6b6b" />
                <Text style={styles.cardioSectionTitle}>Cardio</Text>
              </View>
            )}
            {cardioExercises.map(renderCardioExercise)}
            <Pressable
              style={styles.addExerciseButton}
              onPress={() => { setAddModalTab('exercise'); setShowAddModal(true); }}
            >
              <Ionicons name="add-circle-outline" size={20} color="#4dabf7" />
              <Text style={styles.addExerciseButtonText}>Add Exercise</Text>
            </Pressable>
          </>
        }
      />

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowAddModal(false);
          setExerciseSearch('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Exercise</Text>
              <Pressable
                onPress={() => {
                  setShowAddModal(false);
                  setExerciseSearch('');
                }}
                hitSlop={12}
              >
                <Ionicons name="close" size={24} color="#aaa" />
              </Pressable>
            </View>
            <View style={styles.modalTabs}>
              <Pressable
                style={[styles.modalTab, addModalTab === 'exercise' && styles.modalTabActive]}
                onPress={() => setAddModalTab('exercise')}
              >
                <Ionicons name="barbell-outline" size={16} color={addModalTab === 'exercise' ? '#4dabf7' : '#666'} />
                <Text style={[styles.modalTabText, addModalTab === 'exercise' && styles.modalTabTextActive]}>
                  Strength
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modalTab, addModalTab === 'cardio' && styles.modalTabActive]}
                onPress={() => setAddModalTab('cardio')}
              >
                <Ionicons name="heart-outline" size={16} color={addModalTab === 'cardio' ? '#ff6b6b' : '#666'} />
                <Text style={[styles.modalTabText, addModalTab === 'cardio' && styles.modalTabTextActive, addModalTab === 'cardio' && { color: '#ff6b6b' }]}>
                  Cardio
                </Text>
              </Pressable>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder={addModalTab === 'exercise' ? 'Search exercises...' : 'Search cardio...'}
              placeholderTextColor="#666"
              value={exerciseSearch}
              onChangeText={setExerciseSearch}
              autoFocus
            />
            {addModalTab === 'exercise' ? (
              <FlatList
                data={filteredExercises}
                keyExtractor={(item) => String(item.id)}
                style={styles.modalList}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.exercisePickerRow}
                    onPress={() => handleAddExerciseToExecution(item.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.exercisePickerName}>{item.name}</Text>
                      <Text style={styles.exercisePickerMeta}>
                        {item.sets} sets x {item.reps} reps · {item.restTime || '60'}s rest
                      </Text>
                    </View>
                    <Ionicons name="add" size={22} color="#4dabf7" />
                  </Pressable>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyModalText}>
                    {exerciseSearch ? 'No matching exercises' : 'All exercises already added'}
                  </Text>
                }
              />
            ) : (
              <FlatList
                data={filteredCardioExercises}
                keyExtractor={(item) => String(item.id)}
                style={styles.modalList}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.exercisePickerRow}
                    onPress={() => handleAddCardioToExecution(item.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.exercisePickerName}>{item.name}</Text>
                      <Text style={[styles.exercisePickerMeta, { color: '#ff6b6b' }]}>
                        {formatTime(item.duration)} duration
                      </Text>
                    </View>
                    <Ionicons name="add" size={22} color="#ff6b6b" />
                  </Pressable>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyModalText}>
                    {exerciseSearch ? 'No matching cardio exercises' : 'All cardio exercises already added'}
                  </Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      <View style={styles.bottomBar}>
        <Pressable style={styles.finishButton} onPress={handleFinishTraining}>
          <Ionicons name="checkmark-done" size={20} color="#fff" />
          <Text style={styles.finishButtonText}>Finish Training</Text>
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
    paddingBottom: 100,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 8,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalList: {
    paddingHorizontal: 16,
  },
  exercisePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
    gap: 12,
  },
  exercisePickerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  exercisePickerMeta: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  emptyModalText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
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
  modalTabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  modalTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2a2a2a',
  },
  modalTabActive: {
    backgroundColor: '#1a2633',
    borderWidth: 1,
    borderColor: '#4dabf7',
  },
  modalTabText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  modalTabTextActive: {
    color: '#4dabf7',
  },
});
