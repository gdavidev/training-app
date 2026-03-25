import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppDataSource } from "../../data-source";
import { Muscle } from "../../entities/Muscle";

const repo = () => AppDataSource.getRepository(Muscle);

const muscleKeys = {
  all: ["muscles"] as const,
  detail: (id: number) => ["muscles", id] as const,
};

export function useMuscleList() {
  return useQuery({
    queryKey: muscleKeys.all,
    queryFn: () => repo().find({ order: { name: "ASC" } }),
  });
}

export function useMuscleById(id: number) {
  return useQuery({
    queryKey: muscleKeys.detail(id),
    queryFn: () => repo().findOneByOrFail({ id }),
    enabled: !!id,
  });
}

export function useMuscleCreate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Muscle>) => repo().save(repo().create(data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: muscleKeys.all }),
  });
}

export function useMuscleUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Muscle> & { id: number }) =>
      repo().update(id, data),
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: muscleKeys.all });
      qc.invalidateQueries({ queryKey: muscleKeys.detail(variables.id) });
    },
  });
}

export function useMuscleDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => repo().delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: muscleKeys.all }),
  });
}
