import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation
} from "typeorm";
import { Execution } from "./Execution";
import { Exercise } from "./Exercise";

@Entity("execution_exercise")
export class ExecutionExercise {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Execution, { onDelete: "CASCADE" })
  execution: Relation<Execution>;

  @ManyToOne(() => Exercise, { onDelete: "CASCADE" })
  exercise: Relation<Exercise>;

  @Column({ type: "float", default: 0 })
  weight: string;
  
  @Column({ type: "boolean", default: false })
  completed: boolean;

  @Column({ default: "" })
  completedReps: string;

  @Column({ type: "int", default: 0 })
  completedSets: number;
}
