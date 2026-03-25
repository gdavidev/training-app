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
      const item = await repo().findOneByOrFail({ id });
      return repo().update(id, { completedSets: (item.completedSets ?? 0) + 1 });
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
