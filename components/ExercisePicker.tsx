import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CardioExercise } from '../entities/CardioExercise';
import { Exercise } from '../entities/Exercise';
import { useCardioExerciseCreate, useCardioExerciseList } from '../hooks/query/useCardioExercise';
import { useExerciseCreate, useExerciseList } from '../hooks/query/useExercise';

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface ExercisePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: Exercise) => void;
  onSelectCardioExercise: (cardioExercise: CardioExercise) => void;
  excludeExerciseIds?: Set<number>;
  excludeCardioExerciseIds?: Set<number>;
}

export function ExercisePicker({
  visible,
  onClose,
  onSelectExercise,
  onSelectCardioExercise,
  excludeExerciseIds,
  excludeCardioExerciseIds,
}: ExercisePickerProps) {
  const insets = useSafeAreaInsets();
  const { data: allExercises = [] } = useExerciseList();
  const { data: allCardioExercises = [] } = useCardioExerciseList();
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [addModalTab, setAddModalTab] = useState<'exercise' | 'cardio'>('exercise');
  const [cardioCreateMode, setCardioCreateMode] = useState(false);
  const [createDurationMin, setCreateDurationMin] = useState('30');
  const [createDurationSec, setCreateDurationSec] = useState('0');

  const createExercise = useExerciseCreate();
  const createCardioExercise = useCardioExerciseCreate();

  const filteredExercises = useMemo(() => {
    return allExercises.filter((ex) => {
      if (excludeExerciseIds?.has(ex.id)) return false;
      if (!exerciseSearch.trim()) return true;
      return ex.name.toLowerCase().includes(exerciseSearch.toLowerCase());
    });
  }, [allExercises, excludeExerciseIds, exerciseSearch]);

  const filteredCardioExercises = useMemo(() => {
    return allCardioExercises.filter((ce) => {
      if (excludeCardioExerciseIds?.has(ce.id)) return false;
      if (!exerciseSearch.trim()) return true;
      return ce.name.toLowerCase().includes(exerciseSearch.toLowerCase());
    });
  }, [allCardioExercises, excludeCardioExerciseIds, exerciseSearch]);

  const handleClose = () => {
    setExerciseSearch('');
    setCardioCreateMode(false);
    setCreateDurationMin('30');
    setCreateDurationSec('0');
    onClose();
  };

  const handleTabChange = (tab: 'exercise' | 'cardio') => {
    setAddModalTab(tab);
    setCardioCreateMode(false);
  };

  const handleCreateStrength = async () => {
    const name = exerciseSearch.trim();
    if (!name) return;
    const created = await createExercise.mutateAsync({
      name,
      sets: '3',
      reps: '10',
      restTime: '60',
      muscleKeys: [],
    });
    onSelectExercise(created);
    handleClose();
  };

  const handleCreateCardio = async () => {
    const name = exerciseSearch.trim();
    if (!name) return;
    const totalDuration =
      parseInt(createDurationMin || '0', 10) * 60 + parseInt(createDurationSec || '0', 10);
    const created = await createCardioExercise.mutateAsync({ name, duration: totalDuration });
    onSelectCardioExercise(created);
    handleClose();
  };

  const searchName = exerciseSearch.trim();
  const hasName = searchName.length > 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom + 16, 32) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Exercise</Text>
              <Pressable onPress={handleClose} hitSlop={12}>
                <Ionicons name="close" size={24} color="#aaa" />
              </Pressable>
            </View>
            <View style={styles.modalTabs}>
              <Pressable
                style={[styles.modalTab, addModalTab === 'exercise' && styles.modalTabActive]}
                onPress={() => handleTabChange('exercise')}
              >
                <Ionicons name="barbell-outline" size={16} color={addModalTab === 'exercise' ? '#4dabf7' : '#666'} />
                <Text style={[styles.modalTabText, addModalTab === 'exercise' && styles.modalTabTextActive]}>
                  Strength
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modalTab, addModalTab === 'cardio' && styles.modalTabActive]}
                onPress={() => handleTabChange('cardio')}
              >
                <Ionicons name="heart-outline" size={16} color={addModalTab === 'cardio' ? '#ff6b6b' : '#666'} />
                <Text style={[styles.modalTabText, addModalTab === 'cardio' && styles.modalTabTextActive, addModalTab === 'cardio' && { color: '#ff6b6b' }]}>
                  Cardio
                </Text>
              </Pressable>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder={addModalTab === 'exercise' ? 'Search or type a name...' : 'Search or type a name...'}
              placeholderTextColor="#666"
              value={exerciseSearch}
              onChangeText={(t) => { setExerciseSearch(t); setCardioCreateMode(false); }}
              autoFocus
            />

            {addModalTab === 'exercise' ? (
              <FlatList
                data={filteredExercises}
                keyExtractor={(item) => String(item.id)}
                style={styles.modalList}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.exercisePickerRow}
                    onPress={() => onSelectExercise(item)}
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
                ListHeaderComponent={
                  <Pressable
                    style={[styles.newExerciseRow, createExercise.isPending && { opacity: 0.6 }]}
                    onPress={handleCreateStrength}
                    disabled={!hasName || createExercise.isPending}
                  >
                    {createExercise.isPending ? (
                      <ActivityIndicator size="small" color="#4dabf7" />
                    ) : (
                      <View style={styles.newExerciseIcon}>
                        <Ionicons name="add" size={18} color="#4dabf7" />
                      </View>
                    )}
                    <Text style={[styles.newExerciseText, !hasName && styles.newExerciseTextDim]}>
                      {hasName ? `New exercise "${searchName}"` : 'New exercise'}
                    </Text>
                  </Pressable>
                }
                ListEmptyComponent={
                  <Text style={styles.emptyModalText}>No matches</Text>
                }
              />
            ) : cardioCreateMode ? (
              <View style={[styles.modalList, styles.cardioCreateForm]}>
                <Text style={styles.createFormLabel}>Creating "{searchName}"</Text>
                <Text style={styles.createFormSubLabel}>Set default duration</Text>
                <View style={styles.durationRow}>
                  <View style={styles.durationField}>
                    <TextInput
                      style={styles.durationInput}
                      value={createDurationMin}
                      onChangeText={setCreateDurationMin}
                      keyboardType="numeric"
                      placeholder="30"
                      placeholderTextColor="#555"
                      selectTextOnFocus
                    />
                    <Text style={styles.durationUnit}>min</Text>
                  </View>
                  <Text style={styles.durationSep}>:</Text>
                  <View style={styles.durationField}>
                    <TextInput
                      style={styles.durationInput}
                      value={createDurationSec}
                      onChangeText={setCreateDurationSec}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#555"
                      selectTextOnFocus
                    />
                    <Text style={styles.durationUnit}>sec</Text>
                  </View>
                </View>
                <View style={styles.cardioCreateActions}>
                  <Pressable
                    style={styles.cancelCreateBtn}
                    onPress={() => setCardioCreateMode(false)}
                  >
                    <Text style={styles.cancelCreateText}>Back</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.confirmCreateBtn, createCardioExercise.isPending && { opacity: 0.6 }]}
                    onPress={handleCreateCardio}
                    disabled={createCardioExercise.isPending}
                  >
                    {createCardioExercise.isPending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.confirmCreateText}>Create &amp; Add</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : (
              <FlatList
                data={filteredCardioExercises}
                keyExtractor={(item) => String(item.id)}
                style={styles.modalList}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.exercisePickerRow}
                    onPress={() => onSelectCardioExercise(item)}
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
                ListHeaderComponent={
                  <Pressable
                    style={[styles.newExerciseRow, styles.newExerciseRowCardio]}
                    onPress={() => hasName && setCardioCreateMode(true)}
                    disabled={!hasName}
                  >
                    <View style={[styles.newExerciseIcon, styles.newExerciseIconCardio]}>
                      <Ionicons name="add" size={18} color="#ff6b6b" />
                    </View>
                    <Text style={[styles.newExerciseText, styles.newExerciseTextCardio, !hasName && styles.newExerciseTextDim]}>
                      {hasName ? `New exercise "${searchName}"` : 'New exercise'}
                    </Text>
                  </Pressable>
                }
                ListEmptyComponent={
                  <Text style={styles.emptyModalText}>No matches</Text>
                }
              />
            )}

          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  cardioCreateForm: {
    paddingTop: 16,
  },
  createFormLabel: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  createFormSubLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 16,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  durationField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 12,
    gap: 6,
  },
  durationInput: {
    flex: 1,
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
    paddingVertical: 12,
    textAlign: 'center',
  },
  durationUnit: {
    color: '#666',
    fontSize: 14,
  },
  durationSep: {
    color: '#666',
    fontSize: 22,
    fontWeight: '600',
  },
  cardioCreateActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelCreateBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
  },
  cancelCreateText: {
    color: '#aaa',
    fontSize: 15,
    fontWeight: '600',
  },
  confirmCreateBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#c0392b',
    alignItems: 'center',
  },
  confirmCreateText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  newExerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  newExerciseRowCardio: {},
  newExerciseIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1a2633',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newExerciseIconCardio: {
    backgroundColor: '#2a1a1a',
  },
  newExerciseText: {
    color: '#4dabf7',
    fontSize: 15,
    fontWeight: '600',
  },
  newExerciseTextCardio: {
    color: '#ff6b6b',
  },
  newExerciseTextDim: {
    color: '#555',
  },
});
