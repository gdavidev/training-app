import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
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
import { useCardioExerciseList } from '../hooks/query/useCardioExercise';
import { useExerciseList } from '../hooks/query/useExercise';
import { setPendingExerciseCallback } from '../utils/exercisePickerCallback';

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
  const router = useRouter();
  const { data: allExercises = [] } = useExerciseList();
  const { data: allCardioExercises = [] } = useCardioExerciseList();
  const [exerciseSearch, setExerciseSearch] = useState('');
  const searchInputRef = useRef<TextInput>(null);
  const [addModalTab, setAddModalTab] = useState<'exercise' | 'cardio'>('exercise');

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
    onClose();
  };

  const handleTabChange = (tab: 'exercise' | 'cardio') => {
    setAddModalTab(tab);
  };

  const handleNewExercise = (type: 'strength' | 'cardio') => {
    setPendingExerciseCallback((exercise, createdType) => {
      if (createdType === 'strength') {
        onSelectExercise(exercise as Exercise);
      } else {
        onSelectCardioExercise(exercise as CardioExercise);
      }
    });
    handleClose();
    router.push({
      pathname: '/add-exercise',
      params: { name: exerciseSearch.trim(), type },
    });
  };

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
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search or type a name..."
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
                    style={styles.newExerciseRow}
                    onPress={() => handleNewExercise('strength')}
                  >
                    <View style={styles.newExerciseIcon}>
                      <Ionicons name="add" size={18} color="#4dabf7" />
                    </View>
                    <Text style={styles.newExerciseText}>New exercise</Text>
                  </Pressable>
                }
                ListEmptyComponent={
                  <Text style={styles.emptyModalText}>No matches</Text>
                }
              />
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
                        {formatTime(item.maxDuration)} duration
                      </Text>
                    </View>
                    <Ionicons name="add" size={22} color="#ff6b6b" />
                  </Pressable>
                )}
                ListHeaderComponent={
                  <Pressable
                    style={[styles.newExerciseRow, styles.newExerciseRowCardio]}
                    onPress={() => handleNewExercise('cardio')}
                  >
                    <View style={[styles.newExerciseIcon, styles.newExerciseIconCardio]}>
                      <Ionicons name="add" size={18} color="#ff6b6b" />
                    </View>
                    <Text style={[styles.newExerciseText, styles.newExerciseTextCardio]}>
                      New exercise
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
});
