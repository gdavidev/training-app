import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppDataSource } from "../../data-source";
import { CardioExercise } from "../../entities/CardioExercise";

const repo = () => AppDataSource.getRepository(CardioExercise);

const cardioExerciseKeys = {
  all: ["cardioExercises"] as const,
  detail: (id: number) => ["cardioExercises", id] as const,
};

export function useCardioExerciseList() {
  return useQuery({
    queryKey: cardioExerciseKeys.all,
    queryFn: () => repo().find({ order: { createdAt: "DESC" } }),
  });
}

export function useCardioExerciseCreate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; maxDuration: number }) =>
      repo().save(repo().create(data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: cardioExerciseKeys.all }),
  });
}

export function useCardioExerciseUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; name?: string; maxDuration?: number }) =>
      repo().update(id, data),
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: cardioExerciseKeys.all });
      qc.invalidateQueries({ queryKey: cardioExerciseKeys.detail(variables.id) });
    },
  });
}

export function useCardioExerciseDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => repo().delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: cardioExerciseKeys.all }),
  });
}
