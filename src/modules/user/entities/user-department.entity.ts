import { Entity, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';
import { Department } from '@modules/department/entities/department.entity';

@Entity('user_departments')
export class UserDepartment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User)
    user: User;

    @ManyToOne(() => Department)
    department: Department;
}
