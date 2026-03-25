import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from "typeorm";
import { Execution } from "./Execution";
import { CardioExercise } from "./CardioExercise";

@Entity("execution_cardio_exercise")
export class ExecutionCardioExercise {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Execution, { onDelete: "CASCADE" })
  execution: Relation<Execution>;

  @ManyToOne(() => CardioExercise, { onDelete: "CASCADE", eager: true })
  cardioExercise: Relation<CardioExercise>;

  @Column({ type: "boolean", default: false })
  completed: boolean;

  @Column({ type: "int", default: 0 })
  elapsedSeconds: number;
}
