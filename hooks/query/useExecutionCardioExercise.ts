import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppDataSource } from "../../data-source";
import { ExecutionCardioExercise } from "../../entities/ExecutionCardioExercise";

const repo = () => AppDataSource.getRepository(ExecutionCardioExercise);

const executionCardioKeys = {
  all: ["executionCardioExercises"] as const,
  byExecution: (executionId: number) =>
    ["executionCardioExercises", "execution", executionId] as const,
  detail: (id: number) => ["executionCardioExercises", id] as const,
};

const invalidateAll = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: executionCardioKeys.all });
  qc.invalidateQueries({ queryKey: ["executions"] });
};

export function useExecutionCardioExerciseByExecution(executionId: number) {
  return useQuery({
    queryKey: executionCardioKeys.byExecution(executionId),
    queryFn: () =>
      repo().find({
        where: { execution: { id: executionId } },
        relations: { cardioExercise: true },
      }),
    enabled: !!executionId,
  });
}

export function useExecutionCardioExerciseCreate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ExecutionCardioExercise>) =>
      repo().save(repo().create(data)),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useExecutionCardioExerciseUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: Partial<ExecutionCardioExercise> & { id: number }) => repo().update(id, data),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useExecutionCardioExerciseToggleCompleted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const item = await repo().findOneByOrFail({ id });
      return repo().update(id, { completed: !item.completed });
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useExecutionCardioExerciseDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => repo().delete(id),
    onSuccess: () => invalidateAll(qc),
  });
}
