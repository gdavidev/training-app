import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useExecutionList } from '../hooks/query/useExecution';

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function toDateKey(d: Date) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

type DayInfo = {
  label: string;
  trained: boolean;
  isToday: boolean;
  presetNames: string[];
};

function useWeekData(executions: ReturnType<typeof useExecutionList>['data']) {
  return useMemo(() => {
    const list = executions ?? [];

    const trainedMap = new Map<string, string[]>();
    for (const e of list) {
      const key = toDateKey(e.startedAt ?? e.createAt);
      const name = e.preset?.name ?? '';
      const existing = trainedMap.get(key);
      if (existing) {
        if (!existing.includes(name)) existing.push(name);
      } else {
        trainedMap.set(key, [name]);
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: DayInfo[] = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - i));
      const key = toDateKey(date);
      return {
        label: SHORT_DAYS[date.getDay()],
        trained: trainedMap.has(key),
        isToday: i === 6,
        presetNames: trainedMap.get(key) ?? [],
      };
    });

    let streak = 0;
    let cursor = new Date(today);
    if (!trainedMap.has(toDateKey(cursor))) {
      cursor.setDate(cursor.getDate() - 1);
    }
    while (trainedMap.has(toDateKey(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    return { days, streak };
  }, [executions]);
}

export default function WeekTracker() {
  const { data: executions } = useExecutionList();
  const { days, streak } = useWeekData(executions);

  return (
    <View style={styles.weekCard}>
      <View style={styles.weekHeader}>
        <View style={styles.streakRow}>
          <Ionicons name="flame" size={22} color="#ff922b" />
          <Text style={styles.streakCount}>{streak}</Text>
        </View>
        <Text style={styles.streakLabel}>
          {streak === 0
            ? 'No active streak'
            : `${streak} day${streak !== 1 ? 's' : ''} in a row`}
        </Text>
      </View>

      <View style={styles.daysRow}>
        {days.map((day, i) => (
          <View key={i} style={styles.dayItem}>
            <Text style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}>
              {day.label}
            </Text>
            <View
              style={[
                styles.dayChip,
                day.trained && styles.dayChipTrained,
                day.isToday && !day.trained && styles.dayChipToday,
              ]}
            >
              {day.trained ? (
                <Ionicons name="checkmark" size={16} color="#fff" />
              ) : (
                <View style={styles.dayChipDot} />
              )}
            </View>
            {day.presetNames.length > 0 ? (
              <View style={styles.presetList}>
                {day.presetNames.map((name) => (
                  <Text
                    key={name}
                    style={[styles.presetLabel, day.isToday && styles.presetLabelToday]}
                    numberOfLines={1}
                  >
                    {name}
                  </Text>
                ))}
              </View>
            ) : (
              <View style={styles.presetList} />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  weekCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakCount: {
    color: '#ff922b',
    fontSize: 20,
    fontWeight: '700',
  },
  streakLabel: {
    color: '#888',
    fontSize: 13,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayItem: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  dayLabel: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
  },
  dayLabelToday: {
    color: '#4dabf7',
    fontWeight: '700',
  },
  dayChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipTrained: {
    backgroundColor: '#ff922b',
  },
  dayChipToday: {
    borderWidth: 2,
    borderColor: '#4dabf7',
  },
  dayChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#444',
  },
  presetList: {
    alignItems: 'center',
    minHeight: 14,
  },
  presetLabel: {
    color: '#888',
    fontSize: 10,
    fontWeight: '500',
    maxWidth: 48,
    textAlign: 'center',
  },
  presetLabelToday: {
    color: '#4dabf7',
  },
});
