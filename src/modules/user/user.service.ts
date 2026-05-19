import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserDepartment } from './entities/user-department.entity';
import { AccessRequest } from '@modules/access-request/entities/access-request.entity';
import { Ticket } from '@modules/ticket/entities/ticket.entity';
import { Article } from '@modules/article/entities/article.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { HashService } from '@core/services/hash.service';
import { UserRole } from '@common/enums/user-role.enum';

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        @InjectRepository(UserDepartment)
        private readonly userDeptRepo: Repository<UserDepartment>,
        @InjectRepository(AccessRequest)
        private readonly accessRequestRepo: Repository<AccessRequest>,
        @InjectRepository(Ticket)
        private readonly ticketRepo: Repository<Ticket>,
        @InjectRepository(Article)
        private readonly articleRepo: Repository<Article>,
        private readonly hashService: HashService,
    ) {}

    findAll(role?: UserRole, include?: string[]): Promise<User[]> {
        const where: FindOptionsWhere<User> = {};
        if (role) where.role = role;

        return this.userRepo.find({
            where,
            relations: include ?? [],
            order: { id: 'ASC' },
        });
    }

    getByRole(role: UserRole) {
        return this.userRepo.find({
            where: { role },
            order: { id: 'ASC' },
        });
    }

    async findById(id: string): Promise<User> {
        const user = await this.userRepo.findOne({ where: { id } });
        if (!user) throw new NotFoundException(`Usuário com id ${id} não encontrado.`);
        return user;
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.userRepo.findOne({ where: { email } });
    }

    async findByEmailWithPassword(email: string): Promise<User | null> {
        return this.userRepo
            .createQueryBuilder('user')
            .addSelect('user.password')
            .where('user.email = :email', { email })
            .getOne();
    }

    async save(dto: CreateUserDto) {
        const existing = await this.userRepo.findOne({ where: { email: dto.email } });
        if (existing) throw new ConflictException('E-mail já está em uso');

        const hashedPassword = await this.hashService.hash(dto.password);

        const user = this.userRepo.create({
            ...dto,
            password: hashedPassword,
            isActive: dto.isActive ?? true,
        });

        const savedUser = await this.userRepo.save(user);

        return {
            id: savedUser.id,
            name: savedUser.name,
            email: savedUser.email,
            role: savedUser.role,
            isActive: savedUser.isActive,
        };
    }

    async update(id: string, dto: UpdateUserDto): Promise<User> {
        const user = await this.findById(id);

        Object.assign(user, {
            ...(dto.name && { name: dto.name }),
            ...(dto.role && { role: dto.role }),
            ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        });

        return this.userRepo.save(user);
    }

    async changePassword(id: string, newPassword: string): Promise<User> {
        const user = await this.findById(id);
        user.password = await this.hashService.hash(newPassword);
        return this.userRepo.save(user);
    }

    async remove(id: string): Promise<void> {
        const user = await this.findById(id);

        await this.userDeptRepo.delete({ user: { id } as User });

        await this.accessRequestRepo.update(
            { reviewedBy: { id } as User },
            { reviewedBy: null },
        );
        await this.accessRequestRepo.delete({ requester: { id } as User });

        await this.ticketRepo.update(
            { assignedUser: { id } as User },
            { assignedUser: null },
        );
        await this.ticketRepo.delete({ requester: { id } as User });

        await this.articleRepo
            .createQueryBuilder()
            .update(Article)
            .set({ author: () => 'NULL' } as any)
            .where('author_id = :id', { id })
            .execute();

        await this.userRepo.remove(user);
    }

    async createForAuth(dto: CreateUserDto) {
        return this.save(dto);
    }

    safeUser(user: any) {
        if (!user) return null;
        const { password, ...rest } = user;
        return rest;
    }

    // User-Department methods
    linkDepartment(userId: string, departmentId: string) {
        const link = this.userDeptRepo.create({
            user: { id: userId } as User,
            department: { id: departmentId } as any,
        });
        return this.userDeptRepo.save(link);
    }

    findDepartments(userId: string) {
        return this.userDeptRepo.find({
            where: { user: { id: userId } },
            relations: ['department'],
        });
    }
}
