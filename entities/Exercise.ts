import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  Relation
} from "typeorm";
import { Muscle } from "./Muscle";

@Entity("exercise")
export class Exercise {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ default: "" })
  sets: string;

  @Column({ default: "" })
  reps: string;

  @Column({ default: "" })
  restTime: string;

  @Column({ default: 'single' })
  weightingMethod: string;  // 'single' | 'double' | 'none'

  @Column({ default: 'reps' })
  inputMode: string;  // 'reps' | 'hold'

  @ManyToMany(() => Muscle, { eager: true })
  @JoinTable()
  muscles: Relation<Muscle[]>;

  @CreateDateColumn()
  createdAt: Date;
}
