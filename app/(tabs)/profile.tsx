import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppDataSource } from '../../data-source';
import { CardioExercise } from '../../entities/CardioExercise';
import { Execution } from '../../entities/Execution';
import { ExecutionCardioExercise } from '../../entities/ExecutionCardioExercise';
import { ExecutionExercise } from '../../entities/ExecutionExercise';
import { Exercise } from '../../entities/Exercise';
import { Muscle } from '../../entities/Muscle';
import { Preset } from '../../entities/Preset';
import { PresetCardioExercise } from '../../entities/PresetCardioExercise';
import { PresetExercise } from '../../entities/PresetExercise';
import { queryClient } from '../../hooks/query/queryClient';

export default function ProfileScreen() {
  const handleEraseHistory = () => {
    Alert.alert(
      'Erase history?',
      'This will permanently delete all execution history on this device. Exercises and presets will be kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase',
          style: 'destructive',
          onPress: async () => {
            try {
              await AppDataSource.getRepository(ExecutionExercise).clear();
              await AppDataSource.getRepository(Execution).clear();
              queryClient.invalidateQueries();
            } catch (error) {
              console.error('Failed to erase history', error);
              Alert.alert('Error', 'Failed to erase history.');
            }
          },
        },
      ],
    );
  };

  const handleExport = async () => {
    try {
      const muscles = await AppDataSource.getRepository(Muscle).find();
      const exercises = await AppDataSource.getRepository(Exercise).find({ relations: ['muscles'] });
      const cardioExercises = await AppDataSource.getRepository(CardioExercise).find();
      const presets = await AppDataSource.getRepository(Preset).find({ relations: ['exercises', 'exercises.exercise', 'cardioExercises', 'cardioExercises.cardioExercise'] });
      const executions = await AppDataSource.getRepository(Execution).find({ relations: ['exercises', 'exercises.exercise', 'cardioExercises', 'cardioExercises.cardioExercise', 'preset'] });

      const data = { muscles, exercises, cardioExercises, presets, executions };
      const json = JSON.stringify(data, null, 2);
      const fileUri = FileSystem.cacheDirectory + 'davi-training-export.json';
      await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Export training data' });
    } catch (error) {
      console.error('Failed to export data', error);
      Alert.alert('Error', 'Failed to export data.');
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
      if (result.canceled) return;

      const fileUri = result.assets[0].uri;
      const json = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
      const data = JSON.parse(json);

      Alert.alert(
        'Import data?',
        'This will add imported data to your existing data. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Import',
            onPress: async () => {
              try {
                if (data.muscles?.length) {
                  const repo = AppDataSource.getRepository(Muscle);
                  for (const m of data.muscles) {
                    const existing = await repo.findOne({ where: { key: m.key } });
                    if (!existing) await repo.save(repo.create({ name: m.name, key: m.key }));
                  }
                }
                if (data.exercises?.length) {
                  const repo = AppDataSource.getRepository(Exercise);
                  const muscleRepo = AppDataSource.getRepository(Muscle);
                  for (const ex of data.exercises) {
                    const muscleEntities = [];
                    for (const m of (ex.muscles ?? [])) {
                      const found = await muscleRepo.findOne({ where: { key: m.key } });
                      if (found) muscleEntities.push(found);
                    }
                    const entity = repo.create({ name: ex.name, sets: ex.sets, reps: ex.reps, restTime: ex.restTime, weightingMethod: ex.weightingMethod, inputMode: ex.inputMode, muscles: muscleEntities });
                    await repo.save(entity);
                  }
                }
                if (data.cardioExercises?.length) {
                  const repo = AppDataSource.getRepository(CardioExercise);
                  for (const ce of data.cardioExercises) {
                    await repo.save(repo.create({ name: ce.name, duration: ce.duration }));
                  }
                }
                if (data.presets?.length) {
                  const presetRepo = AppDataSource.getRepository(Preset);
                  const peRepo = AppDataSource.getRepository(PresetExercise);
                  const pceRepo = AppDataSource.getRepository(PresetCardioExercise);
                  const exRepo = AppDataSource.getRepository(Exercise);
                  const ceRepo = AppDataSource.getRepository(CardioExercise);
                  for (const p of data.presets) {
                    const preset = await presetRepo.save(presetRepo.create({ name: p.name }));
                    for (const pe of (p.exercises ?? [])) {
                      if (pe.exercise) {
                        const ex = await exRepo.findOne({ where: { name: pe.exercise.name } });
                        if (ex) await peRepo.save(peRepo.create({ preset, exercise: ex, order: pe.order }));
                      }
                    }
                    for (const pce of (p.cardioExercises ?? [])) {
                      if (pce.cardioExercise) {
                        const ce = await ceRepo.findOne({ where: { name: pce.cardioExercise.name } });
                        if (ce) await pceRepo.save(pceRepo.create({ preset, cardioExercise: ce, order: pce.order }));
                      }
                    }
                  }
                }
                queryClient.invalidateQueries();
                Alert.alert('Success', 'Data imported successfully.');
              } catch (err) {
                console.error('Failed to import data', err);
                Alert.alert('Error', 'Failed to import data.');
              }
            },
          },
        ],
      );
    } catch (error) {
      console.error('Failed to read file', error);
      Alert.alert('Error', 'Failed to read the selected file.');
    }
  };

  const handleEraseStorage = () => {
    Alert.alert(
      'Erase all data?',
      'This will permanently delete all saved workouts, presets and execution history on this device. This is intended for debugging.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase',
          style: 'destructive',
          onPress: async () => {
            try {
              await AppDataSource.getRepository(ExecutionExercise).clear();
              await AppDataSource.getRepository(Execution).clear();
              await AppDataSource.getRepository(PresetExercise).clear();
              await AppDataSource.getRepository(Preset).clear();
              await AppDataSource.getRepository(Exercise).clear();
              await AppDataSource.getRepository(Muscle).clear();
              queryClient.invalidateQueries();
            } catch (error) {
              console.error('Failed to erase data', error);
              Alert.alert('Error', 'Failed to erase data.');
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.section}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>
          Manage your exercises, presets and app data.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>

        <Pressable style={styles.eraseHistoryButton} onPress={handleEraseHistory}>
          <Ionicons name="time-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.eraseButtonText}>Erase history</Text>
        </Pressable>

        <Text style={styles.helperText}>
          Deletes all execution history. Exercises and presets are kept.
        </Text>

        <Pressable style={[styles.eraseButton, { marginTop: 14 }]} onPress={handleEraseStorage}>
          <Ionicons name="trash-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.eraseButtonText}>Erase all stored data</Text>
        </Pressable>

        <Text style={styles.helperText}>
          This only affects data stored on this device. It cannot be undone.
        </Text>

        <Pressable style={[styles.dataButton, { marginTop: 20 }]} onPress={handleExport}>
          <Ionicons name="download-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.eraseButtonText}>Export data</Text>
        </Pressable>

        <Text style={styles.helperText}>
          Save all exercises, presets and history as a JSON file.
        </Text>

        <Pressable style={[styles.dataButton, { marginTop: 14 }]} onPress={handleImport}>
          <Ionicons name="push-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.eraseButtonText}>Import data</Text>
        </Pressable>

        <Text style={styles.helperText}>
          Load exercises, presets and history from a previously exported JSON file.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  section: {
    marginBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#aaa',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#777',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  eraseHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#c66900',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  eraseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#b00020',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  eraseButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  dataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4dabf7',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  helperText: {
    marginTop: 10,
    fontSize: 12,
    color: '#777',
  },
});
