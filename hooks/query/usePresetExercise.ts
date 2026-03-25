import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppDataSource } from "../../data-source";
import { PresetExercise } from "../../entities/PresetExercise";

const repo = () => AppDataSource.getRepository(PresetExercise);

const presetExerciseKeys = {
  all: ["presetExercises"] as const,
  byPreset: (presetId: number) => ["presetExercises", "preset", presetId] as const,
  detail: (id: number) => ["presetExercises", id] as const,
};

export function usePresetExerciseList() {
  return useQuery({
    queryKey: presetExerciseKeys.all,
    queryFn: () => repo().find({ relations: { exercise: true, preset: true } }),
  });
}

export function usePresetExerciseByPreset(presetId: number) {
  return useQuery({
    queryKey: presetExerciseKeys.byPreset(presetId),
    queryFn: () =>
      repo().find({
        where: { preset: { id: presetId } },
        relations: { exercise: true },
        order: { order: "ASC" },
      }),
    enabled: !!presetId,
  });
}

export function usePresetExerciseCreate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<PresetExercise>) =>
      repo().save(repo().create(data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: presetExerciseKeys.all });
      qc.invalidateQueries({ queryKey: ["presets"] });
    },
  });
}

export function usePresetExerciseUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<PresetExercise> & { id: number }) =>
      repo().update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: presetExerciseKeys.all });
      qc.invalidateQueries({ queryKey: ["presets"] });
    },
  });
}

export function usePresetExerciseDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => repo().delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: presetExerciseKeys.all });
      qc.invalidateQueries({ queryKey: ["presets"] });
    },
  });
}