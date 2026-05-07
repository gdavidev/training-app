import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppDataSource } from "../../data-source";
import { Exercise } from "../../entities/Exercise";
import { ExecutionExercise } from "../../entities/ExecutionExercise";
import { Muscle } from "../../entities/Muscle";

const repo = () => AppDataSource.getRepository(Exercise);

const exerciseKeys = {
  all: ["exercises"] as const,
  detail: (id: number) => ["exercises", id] as const,
};

export function useExerciseList() {
  return useQuery({
    queryKey: exerciseKeys.all,
    queryFn: () =>
      repo().find({
        relations: { muscles: true },
        order: { createdAt: "DESC" },
      }),
  });
}

export function useExerciseById(id: number) {
  return useQuery({
    queryKey: exerciseKeys.detail(id),
    queryFn: () =>
      repo().findOneOrFail({
        where: { id },
        relations: { muscles: true },
      }),
    enabled: !!id,
  });
}

export function useExerciseCreate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      sets: string;
      reps: string;
      restTime: string;
      muscleKeys: string[];
      weightingMethod?: string;
      inputMode?: string;
    }) => {
      const muscleRepo = AppDataSource.getRepository(Muscle);
      const muscles = await Promise.all(
        data.muscleKeys.map(async (key) => {
          let muscle = await muscleRepo.findOneBy({ key });
          if (!muscle) {
            muscle = await muscleRepo.save(muscleRepo.create({ key, name: key }));
          }
          return muscle;
        }),
      );

      const exercise = repo().create({
        name: data.name,
        sets: data.sets,
        reps: data.reps,
        restTime: data.restTime,
        muscles,
        ...(data.weightingMethod && { weightingMethod: data.weightingMethod }),
        ...(data.inputMode && { inputMode: data.inputMode }),
      });

      return repo().save(exercise);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: exerciseKeys.all }),
  });
}

export function useExerciseUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      muscleKeys,
      ...data
    }: {
      id: number;
      name?: string;
      sets?: string;
      reps?: string;
      restTime?: string;
      muscleKeys?: string[];
      weightingMethod?: string;
      inputMode?: string;
    }) => {
      const exercise = await repo().findOneOrFail({
        where: { id },
        relations: { muscles: true },
      });

      Object.assign(exercise, data);

      if (muscleKeys) {
        const muscleRepo = AppDataSource.getRepository(Muscle);
        exercise.muscles = await Promise.all(
          muscleKeys.map(async (key) => {
            let muscle = await muscleRepo.findOneBy({ key });
            if (!muscle) {
              muscle = await muscleRepo.save(muscleRepo.create({ key, name: key }));
            }
            return muscle;
          }),
        );
      }

      return repo().save(exercise);
    },
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: exerciseKeys.all });
      qc.invalidateQueries({ queryKey: exerciseKeys.detail(variables.id) });
    },
  });
}

export function useExerciseDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => repo().delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: exerciseKeys.all }),
  });
}

export function useExerciseHistory(exerciseId: number) {
  return useQuery({
    queryKey: ["exerciseHistory", exerciseId] as const,
    queryFn: () =>
      AppDataSource.getRepository(ExecutionExercise).find({
        where: { exercise: { id: exerciseId }, execution: { isCompleted: true } },
        relations: { execution: true },
        order: { execution: { createAt: "ASC" } },
      }),
    enabled: !!exerciseId,
  });
}
