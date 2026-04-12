import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
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
import { CardioExercise } from '../entities/CardioExercise';
import { Exercise } from '../entities/Exercise';
import { useCardioExerciseList } from '../hooks/query/useCardioExercise';
import { useExerciseList } from '../hooks/query/useExercise';

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
  const { data: allExercises = [] } = useExerciseList();
  const { data: allCardioExercises = [] } = useCardioExerciseList();
  const [exerciseSearch, setExerciseSearch] = useState('');
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

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Exercise</Text>
              <Pressable onPress={handleClose} hitSlop={12}>
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
                ListEmptyComponent={
                  <Text style={styles.emptyModalText}>
                    {exerciseSearch ? 'No matching cardio exercises' : 'All cardio exercises already added'}
                  </Text>
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
