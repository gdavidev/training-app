import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from "typeorm";
import { Exercise } from "./Exercise";
import { Preset } from "./Preset";

@Entity("preset_exercise")
export class PresetExercise {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Preset, { onDelete: "CASCADE" })
  preset: Relation<Preset>;

  @ManyToOne(() => Exercise, { eager: true, onDelete: "CASCADE" })
  exercise: Relation<Exercise>;

  @Column({ type: "int", default: 0 })
  order: number;
}
