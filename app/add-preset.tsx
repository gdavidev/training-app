import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ExercisePicker } from '../components/ExercisePicker';
import { CardioExercise } from '../entities/CardioExercise';
import { Exercise } from '../entities/Exercise';
import { useCardioExerciseList } from '../hooks/query/useCardioExercise';
import { useExerciseList } from '../hooks/query/useExercise';
import { usePresetCreate, usePresetList, usePresetUpdate, type PresetItem } from '../hooks/query/usePreset';

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type OrderedEntry =
  | { kind: 'strength'; id: number; exercise: Exercise }
  | { kind: 'cardio'; id: number; exercise: CardioExercise };

export default function AddPresetScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ editId?: string }>();
  const { data: exercises = [] } = useExerciseList();
  const { data: cardioExercises = [] } = useCardioExerciseList();
  const { data: presets = [] } = usePresetList();
  const createPreset = usePresetCreate();
  const updatePreset = usePresetUpdate();

  const editingPreset = useMemo(
    () => params.editId ? presets.find(p => p.id === Number(params.editId)) : undefined,
    [params.editId, presets],
  );
  const isEditing = !!editingPreset;

  const [name, setName] = useState('');
  const [orderedItems, setOrderedItems] = useState<PresetItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [showPickerModal, setShowPickerModal] = useState(false);

  useEffect(() => {
    if (initialized || !editingPreset) return;
    setName(editingPreset.name);

    const strength = editingPreset.exercises.map(pe => ({
      kind: 'strength' as const,
      id: pe.exercise.id,
      order: pe.order,
    }));
    const cardio = (editingPreset.cardioExercises ?? []).map(pce => ({
      kind: 'cardio' as const,
      id: pce.cardioExercise.id,
      order: pce.order,
    }));
    const merged = [...strength, ...cardio].sort((a, b) => a.order - b.order);
    setOrderedItems(merged.map(({ kind, id }) => ({ kind, id })));
    setInitialized(true);
  }, [editingPreset, initialized]);

  const selectedStrengthIds = useMemo(
    () => new Set(orderedItems.filter(i => i.kind === 'strength').map(i => i.id)),
    [orderedItems],
  );
  const selectedCardioIds = useMemo(
    () => new Set(orderedItems.filter(i => i.kind === 'cardio').map(i => i.id)),
    [orderedItems],
  );

  const exerciseMap = useMemo(
    () => new Map(exercises.map(e => [e.id, e])),
    [exercises],
  );
  const cardioMap = useMemo(
    () => new Map(cardioExercises.map(e => [e.id, e])),
    [cardioExercises],
  );

  const orderedEntries: OrderedEntry[] = useMemo(
    () => orderedItems
      .map(item => {
        if (item.kind === 'strength') {
          const ex = exerciseMap.get(item.id);
          return ex ? { kind: 'strength' as const, id: item.id, exercise: ex } : null;
        }
        const ce = cardioMap.get(item.id);
        return ce ? { kind: 'cardio' as const, id: item.id, exercise: ce } : null;
      })
      .filter((e): e is OrderedEntry => !!e),
    [orderedItems, exerciseMap, cardioMap],
  );

  const addExercise = useCallback((id: number) => {
    setOrderedItems(prev => [...prev, { kind: 'strength', id }]);
  }, []);

  const addCardioExercise = useCallback((id: number) => {
    setOrderedItems(prev => [...prev, { kind: 'cardio', id }]);
  }, []);

  const removeItem = useCallback((kind: 'strength' | 'cardio', id: number) => {
    setOrderedItems(prev => prev.filter(i => !(i.kind === kind && i.id === id)));
  }, []);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Missing info', 'Please enter a preset name.');
      return;
    }
    if (orderedItems.length === 0) {
      Alert.alert('No exercises', 'Select at least one exercise for this preset.');
      return;
    }

    try {
      setSaving(true);

      if (isEditing && editingPreset) {
        await updatePreset.mutateAsync({
          id: editingPreset.id,
          name: name.trim(),
          items: orderedItems,
        });
      } else {
        await createPreset.mutateAsync({
          name: name.trim(),
          items: orderedItems,
        });
      }
      router.back();
    } catch (error) {
      console.error('Failed to save preset', error);
      Alert.alert('Error', 'Could not save preset. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [name, orderedItems, router, createPreset, updatePreset, isEditing, editingPreset]);

  const renderPresetItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<OrderedEntry>) => {
      const isCardio = item.kind === 'cardio';
      const ex = item.exercise;

      return (
        <ScaleDecorator>
          <Pressable
            onLongPress={drag}
            delayLongPress={250}
            disabled={isActive}
            style={[styles.exerciseItem, isActive && styles.exerciseItemDragging]}
          >
            <View style={styles.exerciseRow}>
              <Ionicons
                name="reorder-three"
                size={22}
                color="#666"
                style={styles.dragHandle}
              />
              <View style={styles.exerciseInfo}>
                {isCardio ? (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.exerciseName}>{ex.name}</Text>
                      <View style={styles.cardioBadge}>
                        <Ionicons name="heart" size={10} color="#ff6b6b" />
                      </View>
                    </View>
                    <Text style={[styles.exerciseMeta, { color: '#ff6b6b' }]}>
                      {formatDuration((ex as CardioExercise).duration)} duration
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.exerciseName}>{ex.name}</Text>
                    <Text style={styles.exerciseMeta}>
                      {(ex as Exercise).sets} sets x {(ex as Exercise).reps} reps
                    </Text>
                  </>
                )}
              </View>
              <Pressable
                onPress={() => removeItem(item.kind, item.id)}
                hitSlop={8}
                style={styles.removeButton}
              >
                <Ionicons name="close-circle" size={22} color="#ff6b6b" />
              </Pressable>
            </View>
          </Pressable>
        </ScaleDecorator>
      );
    },
    [removeItem],
  );

  const hasAnyExercises = exercises.length + cardioExercises.length > 0;

  return (
    <GestureHandlerRootView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
        >
          <Text style={styles.title}>{isEditing ? 'Edit preset' : 'Create preset'}</Text>
          <Text style={styles.subtitle}>
            Name your preset and choose which existing exercises belong to it.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Preset name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Push day A"
              placeholderTextColor="#666"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Preset exercises</Text>
            {orderedItems.length > 0 && (
              <Text style={styles.countBadge}>{orderedItems.length}</Text>
            )}
          </View>

          {orderedEntries.length === 0 ? (
            <View style={styles.emptyPresetState}>
              <Text style={styles.emptyPresetText}>
                No exercises added yet. Pick from below.
              </Text>
            </View>
          ) : (
            <DraggableFlatList
              data={orderedEntries}
              keyExtractor={item => `${item.kind}-${item.id}`}
              renderItem={renderPresetItem}
              onDragEnd={({ data }) =>
                setOrderedItems(data.map(e => ({ kind: e.kind, id: e.id })))
              }
              scrollEnabled={false}
              activationDistance={10}
              containerStyle={styles.presetList}
            />
          )}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Add exercises</Text>
          </View>

          <Pressable
            style={styles.addExerciseButton}
            onPress={() => setShowPickerModal(true)}
          >
            <Ionicons name="add-circle-outline" size={20} color="#4dabf7" />
            <Text style={styles.addExerciseButtonText}>Add exercise</Text>
          </Pressable>

          <ExercisePicker
            visible={showPickerModal}
            onClose={() => setShowPickerModal(false)}
            onSelectExercise={(ex) => { addExercise(ex.id); setShowPickerModal(false); }}
            onSelectCardioExercise={(ce) => { addCardioExercise(ce.id); setShowPickerModal(false); }}
            excludeExerciseIds={selectedStrengthIds}
            excludeCardioExerciseIds={selectedCardioIds}
          />

          <Pressable
            style={[
              styles.saveButton,
              (saving || !hasAnyExercises) && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={saving || !hasAnyExercises}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : isEditing ? 'Update preset' : 'Save preset'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  countBadge: {
    backgroundColor: '#4dabf7',
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    color: '#aaa',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  emptyPresetState: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderStyle: 'dashed',
    marginBottom: 24,
    alignItems: 'center',
  },
  emptyPresetText: {
    color: '#666',
    fontSize: 14,
  },
  presetList: {
    marginBottom: 24,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#4dabf7',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#1a2633',
  },
  addExerciseButtonText: {
    color: '#4dabf7',
    fontSize: 15,
    fontWeight: '600',
  },
  exerciseItem: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 8,
  },
  exerciseItemDragging: {
    borderColor: '#4dabf7',
    backgroundColor: '#1a2633',
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dragHandle: {
    marginRight: 10,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  exerciseMeta: {
    color: '#aaa',
    fontSize: 13,
  },
  removeButton: {
    padding: 4,
  },
  cardioBadge: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    padding: 3,
    borderRadius: 6,
  },
  saveButton: {
    backgroundColor: '#4dabf7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#4dabf7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#2a5d8f',
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButtonSubtext: {
    color: '#e0f2ff',
    fontSize: 12,
    marginTop: 4,
  },
});
