import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("muscle")
export class Muscle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  key: string; 
}
