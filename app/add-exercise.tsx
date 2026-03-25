import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { type ExtendedBodyPart, type Slug } from 'react-native-body-highlighter';
import { InteractiveMuscleBody } from '../components/MuscleHighlightBody';
import { useExerciseList, useExerciseCreate, useExerciseUpdate } from '../hooks/query/useExercise';
import { useCardioExerciseCreate, useCardioExerciseUpdate, useCardioExerciseList } from '../hooks/query/useCardioExercise';

type ExerciseType = 'strength' | 'cardio';

export default function AddScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ name?: string; muscles?: string; editId?: string; editCardioId?: string; type?: string }>();
    const { data: exercises = [] } = useExerciseList();
    const { data: cardioExercises = [] } = useCardioExerciseList();
    const createExercise = useExerciseCreate();
    const updateExercise = useExerciseUpdate();
    const createCardioExercise = useCardioExerciseCreate();
    const updateCardioExercise = useCardioExerciseUpdate();

    const editingExercise = useMemo(
        () => params.editId ? exercises.find(e => e.id === Number(params.editId)) : undefined,
        [params.editId, exercises],
    );
    const editingCardioExercise = useMemo(
        () => params.editCardioId ? cardioExercises.find(e => e.id === Number(params.editCardioId)) : undefined,
        [params.editCardioId, cardioExercises],
    );
    const isEditing = !!editingExercise || !!editingCardioExercise;

    const [exerciseType, setExerciseType] = useState<ExerciseType>(
        params.type === 'cardio' || !!params.editCardioId ? 'cardio' : 'strength',
    );
    const [name, setName] = useState('');
    const [sets, setSets] = useState('');
    const [reps, setReps] = useState('');
    const [restTime, setRestTime] = useState('');
    const [duration, setDuration] = useState('');
    const [selectedMuscles, setSelectedMuscles] = useState<Slug[]>([]);
    const [bodySide, setBodySide] = useState<'front' | 'back'>('front');
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        if (initialized) return;

        if (editingExercise) {
            setExerciseType('strength');
            setName(editingExercise.name);
            setSets(editingExercise.sets);
            setReps(editingExercise.reps);
            setRestTime(editingExercise.restTime ?? '');
            setSelectedMuscles(
                (editingExercise.muscles ?? []).map(m => m.key as Slug),
            );
            setInitialized(true);
        } else if (editingCardioExercise) {
            setExerciseType('cardio');
            setName(editingCardioExercise.name);
            setDuration(String(editingCardioExercise.duration));
            setInitialized(true);
        } else if (params.name || params.muscles) {
            if (params.name) setName(String(params.name));
            if (params.muscles) {
                const slugs = String(params.muscles)
                    .split(',')
                    .map(m => m.trim())
                    .filter(Boolean) as Slug[];
                setSelectedMuscles(slugs);
            }
            setInitialized(true);
        }
    }, [editingExercise, editingCardioExercise, params, initialized]);

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Missing Info', 'Please enter an exercise name.');
            return;
        }

        try {
            if (exerciseType === 'cardio') {
                const durationSeconds = parseInt(duration, 10);
                if (!durationSeconds || durationSeconds <= 0) {
                    Alert.alert('Missing Info', 'Please enter a valid duration in seconds.');
                    return;
                }

                if (editingCardioExercise) {
                    await updateCardioExercise.mutateAsync({
                        id: editingCardioExercise.id,
                        name: name.trim(),
                        duration: durationSeconds,
                    });
                } else {
                    await createCardioExercise.mutateAsync({
                        name: name.trim(),
                        duration: durationSeconds,
                    });
                }
            } else {
                if (!sets || !reps) {
                    Alert.alert('Missing Info', 'Please fill in sets and reps.');
                    return;
                }

                const data = {
                    name: name.trim(),
                    sets: sets.trim(),
                    reps: reps.trim(),
                    restTime: restTime.trim() || '60',
                    muscleKeys: selectedMuscles as string[],
                };

                if (editingExercise) {
                    await updateExercise.mutateAsync({ id: editingExercise.id, ...data });
                } else {
                    await createExercise.mutateAsync(data);
                }
            }
            router.back();
        } catch (error) {
            console.error('Failed to save exercise', error);
            Alert.alert('Error', 'Could not save exercise. Please try again.');
        }
    };

    const toggleMuscle = (muscle: ExtendedBodyPart, side?: "left" | "right") => {
        setSelectedMuscles(prev => {
            if (!muscle.slug) return prev;
            return prev.includes(muscle.slug)
                ? prev.filter(m => m !== muscle.slug)
                : [...prev, muscle.slug]
        });
    };

    const durationMinutes = Math.floor((parseInt(duration, 10) || 0) / 60);
    const durationRemainder = (parseInt(duration, 10) || 0) % 60;
    const durationPreview = duration
        ? `${durationMinutes}m ${durationRemainder}s`
        : '';

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>

                {!isEditing && (
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Exercise Type</Text>
                        <View style={styles.typeToggle}>
                            <Pressable
                                style={[styles.typeOption, exerciseType === 'strength' && styles.typeOptionActive]}
                                onPress={() => setExerciseType('strength')}
                            >
                                <Ionicons name="barbell-outline" size={20} color={exerciseType === 'strength' ? '#4dabf7' : '#666'} />
                                <Text style={[styles.typeOptionText, exerciseType === 'strength' && styles.typeOptionTextActive]}>
                                    Strength
                                </Text>
                            </Pressable>
                            <Pressable
                                style={[styles.typeOption, exerciseType === 'cardio' && styles.typeOptionActiveCardio]}
                                onPress={() => setExerciseType('cardio')}
                            >
                                <Ionicons name="heart-outline" size={20} color={exerciseType === 'cardio' ? '#ff6b6b' : '#666'} />
                                <Text style={[styles.typeOptionText, exerciseType === 'cardio' && styles.typeOptionTextActiveCardio]}>
                                    Cardio
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                )}

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Exercise Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder={exerciseType === 'cardio' ? 'e.g. Treadmill Run' : 'e.g. Bench Press'}
                        placeholderTextColor="#666"
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                    />
                </View>

                {exerciseType === 'strength' ? (
                    <>
                        <View style={styles.row}>
                            <View style={[styles.inputGroup, styles.flex1, { marginRight: 8 }]}>
                                <Text style={styles.label}>Sets</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0"
                                    placeholderTextColor="#666"
                                    value={sets}
                                    onChangeText={setSets}
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={[styles.inputGroup, styles.flex1, { marginLeft: 8 }]}>
                                <Text style={styles.label}>Reps</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0"
                                    placeholderTextColor="#666"
                                    value={reps}
                                    onChangeText={setReps}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Rest Time (seconds)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="60"
                                placeholderTextColor="#666"
                                value={restTime}
                                onChangeText={setRestTime}
                                keyboardType="numeric"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <View style={styles.bodyHeader}>
                                <Text style={styles.label}>Target Muscles (Tap to select)</Text>
                                <Pressable
                                    style={styles.flipButton}
                                    onPress={() => setBodySide(prev => prev === 'front' ? 'back' : 'front')}
                                >
                                    <Text style={styles.flipButtonText}>Turn to {bodySide === 'front' ? 'Back' : 'Front'}</Text>
                                </Pressable>
                            </View>
                            <View style={styles.bodyContainer}>
                                <InteractiveMuscleBody
                                    selectedMuscles={selectedMuscles}
                                    side={bodySide}
                                    scale={0.8}
                                    onBodyPartPress={toggleMuscle}
                                />
                            </View>
                        </View>
                    </>
                ) : (
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Duration (seconds)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 1800 for 30 minutes"
                            placeholderTextColor="#666"
                            value={duration}
                            onChangeText={setDuration}
                            keyboardType="numeric"
                        />
                        {durationPreview ? (
                            <Text style={styles.durationPreview}>{durationPreview}</Text>
                        ) : null}
                    </View>
                )}

                <Pressable style={[styles.saveButton, exerciseType === 'cardio' && styles.saveButtonCardio]} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>
                        {isEditing
                            ? (exerciseType === 'cardio' ? 'Update Cardio Exercise' : 'Update Exercise')
                            : (exerciseType === 'cardio' ? 'Save Cardio Exercise' : 'Save Exercise')
                        }
                    </Text>
                </Pressable>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    scrollContent: {
        padding: 24,
    },
    inputGroup: {
        marginBottom: 20,
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
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    flex1: {
        flex: 1,
    },
    bodyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    flipButton: {
        backgroundColor: '#2a2a2a',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    flipButtonText: {
        color: '#4dabf7',
        fontSize: 12,
        fontWeight: 'bold',
    },
    bodyContainer: {
        alignItems: 'center',
        paddingVertical: 20,
        backgroundColor: '#1e1e1e',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
    },
    saveButton: {
        backgroundColor: '#4dabf7',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 40,
        shadowColor: "#4dabf7",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    saveButtonCardio: {
        backgroundColor: '#ff6b6b',
        shadowColor: '#ff6b6b',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    typeToggle: {
        flexDirection: 'row',
        gap: 8,
    },
    typeOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#1e1e1e',
        borderWidth: 1,
        borderColor: '#333',
    },
    typeOptionActive: {
        backgroundColor: '#1a2633',
        borderColor: '#4dabf7',
    },
    typeOptionActiveCardio: {
        backgroundColor: '#2a1a1a',
        borderColor: '#ff6b6b',
    },
    typeOptionText: {
        color: '#666',
        fontSize: 15,
        fontWeight: '600',
    },
    typeOptionTextActive: {
        color: '#4dabf7',
    },
    typeOptionTextActiveCardio: {
        color: '#ff6b6b',
    },
    durationPreview: {
        color: '#888',
        fontSize: 13,
        marginTop: 6,
        marginLeft: 4,
    },
});
