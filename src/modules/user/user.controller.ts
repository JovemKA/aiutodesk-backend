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
    Req,
    UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '@core/auth/jwt-auth.guard';
import { RolesGuard } from '@core/auth/roles.guard';
import { Roles } from '@core/auth/roles.decorator';
import { UserRole } from '@common/enums/user-role.enum';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
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

        return this.userService.findAll(role as UserRole, relations);
    }

    @Get('email/:email')
    findByEmail(@Param('email') email: string) {
        return this.userService.findByEmail(email);
    }

    @Get('me/departments')
    @Roles(UserRole.DEV)
    findMyDepartments(@Req() req: Request & { user: { userId: string } }) {
        return this.userService.findDepartments(req.user.userId);
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

    @Delete(':userId/departments/:departmentId')
    unlinkDepartment(
        @Param('userId') userId: string,
        @Param('departmentId') departmentId: string,
    ) {
        return this.userService.unlinkDepartment(userId, departmentId);
    }

    @Patch(':userId/departments/:departmentId/primary')
    setPrimaryDepartment(
        @Param('userId') userId: string,
        @Param('departmentId') departmentId: string,
    ) {
        return this.userService.setPrimaryDepartment(userId, departmentId);
    }

    @Post('me/departments/:departmentId/request')
    @Roles(UserRole.DEV)
    requestDepartmentInclusion(
        @Req() req: Request & { user: { userId: string } },
        @Param('departmentId') departmentId: string,
    ) {
        return this.userService.requestDepartmentInclusion(req.user.userId, departmentId);
    }

    @Post('me/departments/:departmentId/primary-request')
    @Roles(UserRole.DEV)
    requestPrimaryDepartmentChange(
        @Req() req: Request & { user: { userId: string } },
        @Param('departmentId') departmentId: string,
    ) {
        return this.userService.requestPrimaryDepartmentChange(req.user.userId, departmentId);
    }
}
