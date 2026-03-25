import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from "typeorm";
import { CardioExercise } from "./CardioExercise";
import { Preset } from "./Preset";

@Entity("preset_cardio_exercise")
export class PresetCardioExercise {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Preset, { onDelete: "CASCADE" })
  preset: Relation<Preset>;

  @ManyToOne(() => CardioExercise, { eager: true, onDelete: "CASCADE" })
  cardioExercise: Relation<CardioExercise>;

  @Column({ type: "int", default: 0 })
  order: number;
}
