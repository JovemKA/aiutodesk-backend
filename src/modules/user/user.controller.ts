import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    ParseUUIDPipe,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@core/auth/jwt-auth.guard';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get()
    findAll(
        @Query('role') role?: string,
        @Query('include') include?: string | string[],
    ) {
        const relations: string[] =
            typeof include === 'string'
                ? include.split(',').map((s) => s.trim()).filter(Boolean)
                : Array.isArray(include)
                ? include
                : [];

        return this.userService.findAll(role, relations);
    }

    @Get('email/:email')
    findByEmail(@Param('email') email: string) {
        return this.userService.findByEmail(email);
    }

    @Get(':id')
    findById(@Param('id', new ParseUUIDPipe()) id: string) {
        return this.userService.findById(id);
    }

    @Post()
    create(@Body() dto: CreateUserDto) {
        return this.userService.save(dto);
    }

    @Patch(':id')
    update(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() dto: UpdateUserDto,
    ) {
        return this.userService.update(id, dto);
    }

    @Patch(':id/password')
    changePassword(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body('password') password: string,
    ) {
        if (!password) throw new BadRequestException('Senha não informada.');
        return this.userService.changePassword(id, password);
    }

    @Delete(':id')
    remove(@Param('id', new ParseUUIDPipe()) id: string) {
        return this.userService.remove(id);
    }

    // User-Department routes
    @Post(':userId/departments/:departmentId')
    linkDepartment(
        @Param('userId') userId: string,
        @Param('departmentId') departmentId: string,
    ) {
        return this.userService.linkDepartment(userId, departmentId);
    }

    @Get(':userId/departments')
    findDepartments(@Param('userId') userId: string) {
        return this.userService.findDepartments(userId);
    }
}
