import React from 'react';
import { StyleSheet, View } from 'react-native';
import Body, { type BodyProps, type ExtendedBodyPart, type Slug } from 'react-native-body-highlighter';

export type MuscleCount = {
  slug: Slug;
  count: number;
};

/**
 * Graduated blue palette: index 0 is the background,
 * indices 1-3 go from dim to bright based on how many
 * exercises target that muscle.
 */
export const BODY_COLORS = [
  '#1e1e1e',
  '#1a3a5c',
  '#2e7bb5',
  '#4dabf7',
] as const;

const MAX_INTENSITY = BODY_COLORS.length - 1;

function musclesToBodyData(muscles: MuscleCount[]): ExtendedBodyPart[] {
  return muscles.map(({ slug, count }) => ({
    slug,
    intensity: Math.min(Math.max(count, 1), MAX_INTENSITY),
  }));
}

export function aggregateMuscleCountsFromExercises(
  exercises: Array<{ exercise?: { muscles?: Array<{ key: string }> } | null }>,
): MuscleCount[] {
  const counts = new Map<string, number>();
  for (const ee of exercises) {
    if (ee.exercise?.muscles) {
      for (const m of ee.exercise.muscles) {
        counts.set(m.key, (counts.get(m.key) ?? 0) + 1);
      }
    }
  }
  return Array.from(counts, ([slug, count]) => ({ slug: slug as Slug, count }));
}

type MuscleHighlightBodyProps = {
  muscles: MuscleCount[];
  scale?: number;
};

export function MuscleHighlightBody({ muscles, scale = 0.55 }: MuscleHighlightBodyProps) {
  const data = musclesToBodyData(muscles);

  return (
    <View style={styles.row}>
      <Body data={data} colors={BODY_COLORS} scale={scale} side="front" />
      <Body data={data} colors={BODY_COLORS} scale={scale} side="back" />
    </View>
  );
}

type InteractiveMuscleBodyProps = {
  selectedMuscles: Slug[];
  side: 'front' | 'back';
  scale?: number;
  onBodyPartPress: BodyProps['onBodyPartPress'];
};

export function InteractiveMuscleBody({
  selectedMuscles,
  side,
  scale = 0.8,
  onBodyPartPress,
}: InteractiveMuscleBodyProps) {
  const data: ExtendedBodyPart[] = selectedMuscles.map((slug) => ({
    slug,
    intensity: MAX_INTENSITY,
  }));

  return (
    <Body
      data={data}
      colors={BODY_COLORS}
      onBodyPartPress={onBodyPartPress}
      side={side}
      scale={scale}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    columnGap: 8,
  },
});
