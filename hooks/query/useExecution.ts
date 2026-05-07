import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppDataSource } from "../../data-source";
import { Execution } from "../../entities/Execution";
import { ExecutionExercise } from "../../entities/ExecutionExercise";
import { ExecutionCardioExercise } from "../../entities/ExecutionCardioExercise";
import { Exercise } from "../../entities/Exercise";
import { CardioExercise } from "../../entities/CardioExercise";
import { Preset } from "../../entities/Preset";

const repo = () => AppDataSource.getRepository(Execution);

const executionKeys = {
  all: ["executions"] as const,
  detail: (id: number) => ["executions", id] as const,
  current: ["executions", "current"] as const,
};

export function useExecutionList() {
  return useQuery({
    queryKey: executionKeys.all,
    queryFn: () =>
      repo().find({
        where: { isCompleted: true },
        relations: { preset: true, exercises: { exercise: true }, cardioExercises: { cardioExercise: true } },
        order: { createAt: "DESC" },
      }),
  });
}

export function useExecutionById(id: number) {
  return useQuery({
    queryKey: executionKeys.detail(id),
    queryFn: () =>
      repo().findOneOrFail({
        where: { id },
        relations: { preset: true, exercises: { exercise: true }, cardioExercises: { cardioExercise: true } },
      }),
    enabled: !!id,
  });
}

export function useCurrentExecution() {
  return useQuery({
    queryKey: executionKeys.current,
    queryFn: () =>
      repo().findOne({
        where: { isCompleted: false },
        relations: { preset: true, exercises: { exercise: true }, cardioExercises: { cardioExercise: true } },
        order: { createAt: "DESC" },
      }),
  });
}

export function useExecutionStart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      preset: Preset;
      exercises: { exercise: Exercise; weight: string }[];
      cardioExercises?: { cardioExercise: CardioExercise }[];
    }) => {
      const unfinished = await repo().find({ where: { isCompleted: false } });
      if (unfinished.length > 0) {
        await repo().remove(unfinished);
      }

      const execution = repo().create({
        preset: data.preset,
        startedAt: new Date(),
        isCompleted: false,
      });
      const saved = await repo().save(execution);

      const eeRepo = AppDataSource.getRepository(ExecutionExercise);
      for (const item of data.exercises) {
        await eeRepo.save(
          eeRepo.create({
            execution: saved,
            exercise: item.exercise,
            weight: item.weight,
            completed: false,
            completedSets: 0,
          }),
        );
      }

      if (data.cardioExercises?.length) {
        const ceRepo = AppDataSource.getRepository(ExecutionCardioExercise);
        for (const item of data.cardioExercises) {
          await ceRepo.save(
            ceRepo.create({
              execution: saved,
              cardioExercise: item.cardioExercise,
              completed: false,
              elapsedSeconds: 0,
            }),
          );
        }
      }

      return repo().findOneOrFail({
        where: { id: saved.id },
        relations: { preset: true, exercises: { exercise: true }, cardioExercises: { cardioExercise: true } },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: executionKeys.all });
      qc.invalidateQueries({ queryKey: executionKeys.current });
    },
  });
}

export function useExecutionComplete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => repo().update(id, { isCompleted: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: executionKeys.all });
      qc.invalidateQueries({ queryKey: executionKeys.current });
    },
  });
}

export function useExecutionCreate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Execution>) => repo().save(repo().create(data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: executionKeys.all }),
  });
}

export function useExecutionUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Execution> & { id: number }) =>
      repo().save({ id, ...data }),
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: executionKeys.all });
      qc.invalidateQueries({ queryKey: executionKeys.current });
      qc.invalidateQueries({ queryKey: executionKeys.detail(variables.id) });
    },
  });
}

export function useExecutionDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => repo().delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: executionKeys.all });
      qc.invalidateQueries({ queryKey: executionKeys.current });
    },
  });
}

export function usePreviousExecutionForPreset(
  presetId: number | undefined,
  excludeExecutionId: number | undefined,
) {
  return useQuery({
    queryKey: ["executions", "previous-for-preset", presetId, excludeExecutionId],
    queryFn: async () => {
      if (!presetId) return null;
      const results = await repo().find({
        where: { preset: { id: presetId }, isCompleted: true },
        relations: { preset: true, exercises: { exercise: true }, cardioExercises: { cardioExercise: true } },
        order: { createAt: "DESC" },
        take: 2,
      });
      return results.find((e) => e.id !== excludeExecutionId) ?? null;
    },
    enabled: !!presetId,
  });
}
