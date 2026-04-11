import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
    constructor(
        @InjectRepository(Category)
        private readonly categoryRepo: Repository<Category>,
    ) {}

    findAll(relations: string[] = []) {
        return this.categoryRepo.find({ relations });
    }

    async findById(id: string, relations: string[] = []) {
        const category = await this.categoryRepo.findOne({
            where: { id },
            relations,
        });
        if (!category) {
            throw new NotFoundException('Categoria não encontrada.');
        }
        return category;
    }

    create(dto: CreateCategoryDto) {
        const category = this.categoryRepo.create(dto);
        return this.categoryRepo.save(category);
    }

    async update(id: string, dto: UpdateCategoryDto) {
        const category = await this.findById(id);
        Object.assign(category, dto);
        return this.categoryRepo.save(category);
    }

    async remove(id: string) {
        const category = await this.findById(id);
        await this.categoryRepo.remove(category);
        return { message: 'Categoria removida com sucesso.' };
    }
}
