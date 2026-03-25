import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Preset } from '../entities/Preset';
import { MuscleHighlightBody, type MuscleCount } from './MuscleHighlightBody';
import { usePresetList } from '../hooks/query/usePreset';
import { useCurrentExecution, useExecutionDelete, useExecutionStart } from '../hooks/query/useExecution';
import { useLastWeightsMap } from '../hooks/query/useExecutionExercise';

export default function TrainingSelectionScreen() {
  const router = useRouter();
  const { data: presets = [], isLoading: loadingPresets } = usePresetList();
  const { data: currentExecution } = useCurrentExecution();
  const startExecution = useExecutionStart();
  const deleteExecution = useExecutionDelete();
  const { data: lastWeights } = useLastWeightsMap();

  const handleCancelExecution = () => {
    if (!currentExecution) return;
    Alert.alert(
      'Cancel training',
      'Are you sure you want to cancel the current training? All progress will be lost.',
      [
        { text: 'Keep training', style: 'cancel' },
        {
          text: 'Cancel training',
          style: 'destructive',
          onPress: () => deleteExecution.mutate(currentExecution.id),
        },
      ],
    );
  };

  const handleUsePreset = async (preset: Preset) => {
    const exerciseEntries = preset.exercises.map(pe => pe.exercise).filter(Boolean);
    const cardioEntries = (preset.cardioExercises ?? []).map(pce => pce.cardioExercise).filter(Boolean);

    if (exerciseEntries.length === 0 && cardioEntries.length === 0) {
      Alert.alert(
        'No exercises in preset',
        'This preset has no linked exercises yet.',
      );
      return;
    }

    try {
      await startExecution.mutateAsync({
        preset,
        exercises: exerciseEntries.map(ex => ({
          exercise: ex,
          weight: lastWeights?.get(ex.id) ?? '0',
        })),
        cardioExercises: cardioEntries.map(ce => ({ cardioExercise: ce })),
      });
      router.push('/training-execution' as any);
    } catch (error) {
      console.error('Failed to start training from preset', error);
      Alert.alert(
        'Error',
        'Could not start training from this preset. Please try again.',
      );
    }
  };

  const getMusclesFromPreset = (preset: Preset): MuscleCount[] => {
    const counts = new Map<string, number>();
    for (const pe of preset.exercises) {
      if (pe.exercise?.muscles) {
        for (const m of pe.exercise.muscles) {
          counts.set(m.key, (counts.get(m.key) ?? 0) + 1);
        }
      }
    }
    return Array.from(counts, ([slug, count]) => ({ slug: slug as any, count }));
  };

  const renderItem = ({ item }: { item: Preset }) => {
    const muscles = getMusclesFromPreset(item);
    const exerciseCount = item.exercises.length;
    const cardioCount = (item.cardioExercises ?? []).length;
    const totalCount = exerciseCount + cardioCount;

    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{item.name}</Text>
            <Text style={styles.description}>
              {totalCount === 0
                ? 'No linked exercises yet.'
                : `${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''}${cardioCount > 0 ? ` + ${cardioCount} cardio` : ''} in this preset.`}
            </Text>
          </View>
          <Ionicons name="barbell-outline" size={24} color="#4dabf7" />
        </View>

        {muscles.length > 0 && (
          <View style={styles.bodyRow}>
            <MuscleHighlightBody muscles={muscles} scale={0.55} />
          </View>
        )}

        <Pressable style={styles.button} onPress={() => handleUsePreset(item)}>
          <Text style={styles.buttonText}>Use this preset</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loadingPresets ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4dabf7" />
          <Text style={styles.loadingText}>Loading presets...</Text>
        </View>
      ) : (
        <FlatList
          data={presets}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          ListHeaderComponent={
            currentExecution
              ? (
                <Pressable
                  style={styles.currentTrainingCard}
                  onPress={() => router.push('/training-execution' as any)}
                >
                  <View style={styles.currentTrainingHeader}>
                    <Text style={styles.currentTrainingLabel}>Current training</Text>
                    <Ionicons name="flame-outline" size={20} color="#ffb347" />
                  </View>
                  <Text style={styles.currentTrainingTitle}>
                    {currentExecution.preset?.name || 'Custom training'}
                  </Text>
                  <Text style={styles.currentTrainingSubtext}>
                    {currentExecution.startedAt
                      ? new Date(currentExecution.startedAt).toLocaleDateString()
                      : ''}
                  </Text>
                  <Pressable
                    style={styles.cancelButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleCancelExecution();
                    }}
                  >
                    <Ionicons name="close-circle-outline" size={16} color="#ff6b6b" />
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </Pressable>
                </Pressable>
              )
              : null
          }
          ListEmptyComponent={
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                No presets yet. You can create your own workouts by adding custom exercises
                and grouping them into a preset.
              </Text>
            </View>
          }
          ListFooterComponent={
            <View style={styles.footer}>
              <Text style={styles.footerText}>Or create a custom exercise from scratch.</Text>
            </View>
          }
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
  loadingText: {
    marginTop: 8,
    color: '#aaa',
    fontSize: 14,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  currentTrainingCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4dabf7',
  },
  currentTrainingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  currentTrainingLabel: {
    color: '#4dabf7',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currentTrainingTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  currentTrainingSubtext: {
    color: '#aaa',
    fontSize: 13,
    marginTop: 4,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff6b6b',
    gap: 4,
  },
  cancelButtonText: {
    color: '#ff6b6b',
    fontSize: 13,
    fontWeight: '600',
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  description: {
    color: '#aaa',
    fontSize: 13,
    marginTop: 4,
  },
  bodyRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    marginVertical: 8,
    columnGap: 8,
  },
  button: {
    marginTop: 10,
    backgroundColor: '#4dabf7',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  footerText: {
    color: '#aaa',
    fontSize: 13,
    marginBottom: 8,
    textAlign: 'center',
  },
});
