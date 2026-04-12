import React from 'react';
import { StyleSheet, View } from 'react-native';
import TrainingSelectionScreen from '../../components/TrainingSelection';
import WeekTracker from '../../components/WeekTracker';

export default function HomeScreen() {
  return (
    <View style={styles.root}>
      <WeekTracker />
      <TrainingSelectionScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#121212',
  },
});
