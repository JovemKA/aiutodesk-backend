import { Entity, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Department } from '@modules/department/entities/department.entity';
import { Article } from './article.entity';

@Entity('department_articles')
export class DepartmentArticle {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Department)
    department: Department;

    @ManyToOne(() => Article)
    article: Article;
}
