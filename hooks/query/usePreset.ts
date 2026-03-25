import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppDataSource } from "../../data-source";
import { CardioExercise } from "../../entities/CardioExercise";
import { Exercise } from "../../entities/Exercise";
import { Preset } from "../../entities/Preset";
import { PresetCardioExercise } from "../../entities/PresetCardioExercise";
import { PresetExercise } from "../../entities/PresetExercise";

const repo = () => AppDataSource.getRepository(Preset);

const PRESET_RELATIONS = {
  exercises: { exercise: { muscles: true } },
  cardioExercises: { cardioExercise: true },
};

const presetKeys = {
  all: ["presets"] as const,
  detail: (id: number) => ["presets", id] as const,
};

export function usePresetList() {
  return useQuery({
    queryKey: presetKeys.all,
    queryFn: () => repo().find({ relations: PRESET_RELATIONS }),
  });
}

export function usePresetById(id: number) {
  return useQuery({
    queryKey: presetKeys.detail(id),
    queryFn: () =>
      repo().findOneOrFail({
        where: { id },
        relations: PRESET_RELATIONS,
      }),
    enabled: !!id,
  });
}

export type PresetItem =
  | { kind: "strength"; id: number }
  | { kind: "cardio"; id: number };

async function savePresetItems(presetId: number, items: PresetItem[]) {
  const peRepo = AppDataSource.getRepository(PresetExercise);
  const pceRepo = AppDataSource.getRepository(PresetCardioExercise);

  await peRepo.delete({ preset: { id: presetId } });
  await pceRepo.delete({ preset: { id: presetId } });

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === "strength") {
      await peRepo.save(
        peRepo.create({
          preset: { id: presetId } as Preset,
          exercise: { id: item.id } as Exercise,
          order: i,
        }),
      );
    } else {
      await pceRepo.save(
        pceRepo.create({
          preset: { id: presetId } as Preset,
          cardioExercise: { id: item.id } as CardioExercise,
          order: i,
        }),
      );
    }
  }
}

export function usePresetCreate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; items: PresetItem[] }) => {
      const preset = await repo().save(repo().create({ name: data.name }));
      await savePresetItems(preset.id, data.items);
      return preset;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: presetKeys.all }),
  });
}

export function usePresetUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: number; name: string; items: PresetItem[] }) => {
      await repo().update(data.id, { name: data.name });
      await savePresetItems(data.id, data.items);
      return repo().findOneOrFail({
        where: { id: data.id },
        relations: PRESET_RELATIONS,
      });
    },
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: presetKeys.all });
      qc.invalidateQueries({ queryKey: presetKeys.detail(variables.id) });
    },
  });
}

export function usePresetDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => repo().delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: presetKeys.all }),
  });
}
