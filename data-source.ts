import { DataSource } from "typeorm";
import { CardioExercise } from "./entities/CardioExercise";
import { Execution } from "./entities/Execution";
import { ExecutionCardioExercise } from "./entities/ExecutionCardioExercise";
import { ExecutionExercise } from "./entities/ExecutionExercise";
import { Exercise } from "./entities/Exercise";
import { Muscle } from "./entities/Muscle";
import { Preset } from "./entities/Preset";
import { PresetCardioExercise } from "./entities/PresetCardioExercise";
import { PresetExercise } from "./entities/PresetExercise";
import { InitialSchema1711300000000 } from "./migrations/1711300000000-InitialSchema";
import { AddCardioExercise1711400000000 } from "./migrations/1711400000000-AddCardioExercise";
import { AddPresetCardioExercise1711500000000 } from "./migrations/1711500000000-AddPresetCardioExercise";

export const AppDataSource = new DataSource({
  type: "expo",
  database: "davi-training.db",
  driver: require("expo-sqlite"),
  entities: [Exercise, Muscle, Preset, PresetExercise, PresetCardioExercise, Execution, ExecutionExercise, CardioExercise, ExecutionCardioExercise],
  migrations: [InitialSchema1711300000000, AddCardioExercise1711400000000, AddPresetCardioExercise1711500000000],
  migrationsRun: true,
  synchronize: false,
});
