import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppDataSource } from "../../data-source";
import { ExecutionExercise } from "../../entities/ExecutionExercise";

const repo = () => AppDataSource.getRepository(ExecutionExercise);

const executionExerciseKeys = {
  all: ["executionExercises"] as const,
  byExecution: (executionId: number) =>
    ["executionExercises", "execution", executionId] as const,
  detail: (id: number) => ["executionExercises", id] as const,
};

const invalidateAll = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: executionExerciseKeys.all });
  qc.invalidateQueries({ queryKey: ["executions"] });
};

export function useExecutionExerciseList() {
  return useQuery({
    queryKey: executionExerciseKeys.all,
    queryFn: () =>
      repo().find({ relations: { exercise: true, execution: true } }),
  });
}

export function useExecutionExerciseByExecution(executionId: number) {
  return useQuery({
    queryKey: executionExerciseKeys.byExecution(executionId),
    queryFn: () =>
      repo().find({
        where: { execution: { id: executionId } },
        relations: { exercise: true },
      }),
    enabled: !!executionId,
  });
}

export function useExecutionExerciseCreate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ExecutionExercise>) =>
      repo().save(repo().create(data)),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useExecutionExerciseUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: Partial<ExecutionExercise> & { id: number }) => repo().update(id, data),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useExecutionExerciseToggleCompleted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const item = await repo().findOneByOrFail({ id });
      return repo().update(id, { completed: !item.completed });
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useExecutionExerciseIncrementSets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const item = await repo().findOneOrFail({ where: { id }, relations: { exercise: true } });
      const newCount = (item.completedSets ?? 0) + 1;
      const totalSets = parseInt((item.exercise as any)?.sets, 10) || 0;
      const updates: Partial<ExecutionExercise> = { completedSets: newCount };
      if (totalSets > 0 && newCount >= totalSets) {
        updates.completed = true;
      }
      return repo().update(id, updates);
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useExecutionExerciseDecrementSets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const item = await repo().findOneByOrFail({ id });
      const newCount = Math.max((item.completedSets ?? 0) - 1, 0);
      return repo().update(id, { completedSets: newCount, completed: false });
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useExecutionExerciseDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => repo().delete(id),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useExecutionExerciseSwitchExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      newExerciseId,
      weight,
    }: {
      id: number;
      newExerciseId: number;
      weight: string;
    }) => {
      const item = await repo().findOneByOrFail({ id });
      item.exercise = { id: newExerciseId } as any;
      item.weight = weight;
      item.completed = false;
      item.completedSets = 0;
      item.completedReps = '';
      return repo().save(item);
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useLastWeightsMap() {
  return useQuery({
    queryKey: [...executionExerciseKeys.all, "lastWeights"] as const,
    queryFn: async () => {
      const records = await repo().find({
        where: { execution: { isCompleted: true } },
        relations: { exercise: true, execution: true },
        order: { execution: { createAt: "DESC" } },
      });

      const map = new Map<number, string>();
      for (const r of records) {
        const exId = (r.exercise as any)?.id;
        if (exId && !map.has(exId)) {
          map.set(exId, r.weight);
        }
      }
      return map;
    },
  });
}
