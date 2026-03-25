import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from "typeorm";
import type { ExecutionExercise } from "./ExecutionExercise";
import type { ExecutionCardioExercise } from "./ExecutionCardioExercise";
import { Preset } from "./Preset";

@Entity("execution")
export class Execution {
  @PrimaryGeneratedColumn()
  id: number;
  
  @Column({ type: "datetime", nullable: true })
  startedAt: Date;
  
  @Column({ type: "boolean", default: false })
  isCompleted: boolean;
  
  @ManyToOne(() => Preset, { onDelete: "CASCADE" })
  preset: Relation<Preset>;

  @OneToMany("ExecutionExercise", "execution", { cascade: true, eager: true })
  exercises: Relation<ExecutionExercise[]>;

  @OneToMany("ExecutionCardioExercise", "execution", { cascade: true, eager: true })
  cardioExercises: Relation<ExecutionCardioExercise[]>;
  
  @CreateDateColumn()
  createAt: Date;
}
