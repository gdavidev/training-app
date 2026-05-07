import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ExerciseStatus, STATUS_CONFIG } from '../utils/exerciseStatus';

type Props = {
  status: ExerciseStatus;
  compact?: boolean;
};

export function ExerciseStatusBadge({ status, compact }: Props) {
  const config = STATUS_CONFIG[status];

  if (compact) {
    return (
      <Ionicons
        name={config.icon as any}
        size={16}
        color={config.color}
      />
    );
  }

  return (
    <View style={[styles.badge, { backgroundColor: `${config.color}22` }]}>
      <Ionicons name={config.icon as any} size={13} color={config.color} />
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});
