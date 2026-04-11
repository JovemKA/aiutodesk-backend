import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Controller('departments')
export class DepartmentController {
    constructor(private readonly departmentService: DepartmentService) {}

    @Get()
    findAll(@Query('include') include?: string | string[]) {
        const relations: string[] =
            typeof include === 'string'
                ? include.split(',').map((s) => s.trim()).filter(Boolean)
                : Array.isArray(include)
                ? include
                : [];

        return this.departmentService.findAll(relations);
    }

    @Get(':id')
    findById(@Param('id', new ParseUUIDPipe()) id: string) {
        return this.departmentService.findById(id);
    }

    @Post()
    create(@Body() dto: CreateDepartmentDto) {
        return this.departmentService.create(dto);
    }

    @Patch(':id')
    update(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() dto: UpdateDepartmentDto,
    ) {
        return this.departmentService.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id', new ParseUUIDPipe()) id: string) {
        return this.departmentService.remove(id);
    }
}
