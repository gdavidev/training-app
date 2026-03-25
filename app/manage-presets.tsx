import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Preset } from '../entities/Preset';
import { usePresetDelete, usePresetList } from '../hooks/query/usePreset';

export default function ManagePresetsScreen() {
  const router = useRouter();
  const { data: presets = [], isLoading } = usePresetList();
  const deletePreset = usePresetDelete();

  const handleDelete = (preset: Preset) => {
    Alert.alert('Delete preset?', `Remove "${preset.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deletePreset.mutate(preset.id),
      },
    ]);
  };

  const renderItem = ({ item }: { item: Preset }) => (
    <Pressable
      style={styles.card}
      onPress={() => router.push({ pathname: '/add-preset', params: { editId: String(item.id) } })}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardInfo}>
          <Text style={styles.presetName}>{item.name}</Text>
          <Text style={styles.presetMeta}>
            {item.exercises.length} {item.exercises.length === 1 ? 'exercise' : 'exercises'}
          </Text>
        </View>
        <Pressable onPress={() => handleDelete(item)} hitSlop={10} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={20} color="#ff4444" />
        </Pressable>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Loading presets...</Text>
        </View>
      ) : presets.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="layers-outline" size={64} color="#666" />
          <Text style={styles.emptyText}>No presets yet.</Text>
          <Text style={styles.emptySubtext}>
            Create a preset to group exercises together.
          </Text>
        </View>
      ) : (
        <FlatList
          data={presets}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />
      )}

      <Pressable style={styles.fab} onPress={() => router.push('/add-preset')}>
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>
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
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  presetName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  presetMeta: {
    color: '#aaa',
    fontSize: 13,
    marginTop: 4,
  },
  deleteBtn: {
    padding: 8,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4dabf7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
});