import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentService {
    constructor(
        @InjectRepository(Department)
        private readonly deptRepo: Repository<Department>,
    ) {}

    findAll(include?: string[]): Promise<Department[]> {
        return this.deptRepo.find({
            relations: include ?? [],
            order: { name: 'ASC' },
        });
    }

    async findById(id: string): Promise<Department> {
        const department = await this.deptRepo.findOne({ where: { id } });
        if (!department) {
            throw new NotFoundException(`Departamento com id ${id} não encontrado.`);
        }
        return department;
    }

    async create(dto: CreateDepartmentDto): Promise<Department> {
        const department = this.deptRepo.create(dto);
        return await this.deptRepo.save(department);
    }

    async update(id: string, dto: UpdateDepartmentDto): Promise<Department> {
        const department = await this.findById(id);

        Object.assign(department, {
            ...(dto.name && { name: dto.name }),
            ...(dto.costCenter !== undefined && { costCenter: dto.costCenter }),
        });

        return this.deptRepo.save(department);
    }

    async remove(id: string): Promise<void> {
        const department = await this.findById(id);
        await this.deptRepo.remove(department);
    }
}
