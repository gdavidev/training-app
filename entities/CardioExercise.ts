import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("cardio_exercise")
export class CardioExercise {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: "int", default: 0 })
  maxDuration: number;

  @CreateDateColumn()
  createdAt: Date;
}
