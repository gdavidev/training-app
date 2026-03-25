import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from "typeorm";
import type { PresetExercise } from "./PresetExercise";
import type { PresetCardioExercise } from "./PresetCardioExercise";

@Entity("preset")
export class Preset {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @OneToMany("PresetExercise", "preset", { cascade: true, eager: true })
  exercises: Relation<PresetExercise[]>;

  @OneToMany("PresetCardioExercise", "preset", { cascade: true, eager: true })
  cardioExercises: Relation<PresetCardioExercise[]>;
}
