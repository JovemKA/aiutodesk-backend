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
import { AccessRequestStatus } from '@modules/access-request/enums/access-request-status.enum';
import { AccessRequestType } from '@modules/access-request/enums/access-request-type.enum';

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
        if (!user) throw new NotFoundException(`Usuario com id ${id} nao encontrado.`);
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
        if (existing) throw new ConflictException('E-mail ja esta em uso');

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

    async linkDepartment(
        userId: string,
        departmentId: string,
        makePrimary = false,
    ): Promise<UserDepartment> {
        const existing = await this.userDeptRepo.findOne({
            where: {
                user: { id: userId },
                department: { id: departmentId } as any,
            },
            relations: ['department'],
        });

        if (existing) {
            if (makePrimary || !(await this.hasPrimaryDepartment(userId))) {
                return this.setPrimaryDepartment(userId, departmentId);
            }
            return existing;
        }

        const shouldBePrimary = makePrimary || !(await this.hasPrimaryDepartment(userId));
        const link = this.userDeptRepo.create({
            user: { id: userId } as User,
            department: { id: departmentId } as any,
            isPrimary: shouldBePrimary,
        });
        const saved = await this.userDeptRepo.save(link);

        if (saved.isPrimary) {
            await this.normalizePrimaryDepartment(userId, saved.id);
        }

        return this.userDeptRepo.findOneOrFail({
            where: { id: saved.id },
            relations: ['department'],
        });
    }

    async unlinkDepartment(userId: string, departmentId: string) {
        const existing = await this.userDeptRepo.findOne({
            where: {
                user: { id: userId },
                department: { id: departmentId } as any,
            },
        });

        if (!existing) {
            return { success: true };
        }

        await this.userDeptRepo.delete({ id: existing.id });
        if (existing.isPrimary) {
            await this.ensurePrimaryDepartment(userId);
        }

        return { success: true };
    }

    findDepartments(userId: string) {
        return this.userDeptRepo.find({
            where: { user: { id: userId } },
            relations: ['department'],
            order: { isPrimary: 'DESC', id: 'ASC' },
        });
    }

    async setPrimaryDepartment(userId: string, departmentId: string): Promise<UserDepartment> {
        const links = await this.userDeptRepo.find({
            where: { user: { id: userId } },
            relations: ['department'],
            order: { id: 'ASC' },
        });
        const target = links.find((link) => link.department?.id === departmentId);
        if (!target) {
            throw new NotFoundException('Departamento nao esta vinculado ao usuario.');
        }

        for (const link of links) {
            link.isPrimary = link.id === target.id;
        }
        await this.userDeptRepo.save(links);

        return this.userDeptRepo.findOneOrFail({
            where: { id: target.id },
            relations: ['department'],
        });
    }

    async requestDepartmentInclusion(userId: string, departmentId: string) {
        const user = await this.findById(userId);
        if (user.role !== UserRole.DEV) {
            throw new ConflictException('Apenas usuarios Dev podem solicitar inclusao em departamento.');
        }

        const existingLink = await this.userDeptRepo.findOne({
            where: {
                user: { id: userId },
                department: { id: departmentId } as any,
            },
        });
        if (existingLink) {
            throw new ConflictException('Usuario ja esta vinculado a este departamento.');
        }

        await this.ensureNoPendingAccessRequest(userId);
        const request = this.accessRequestRepo.create({
            requester: { id: userId } as User,
            requestedRole: null,
            requestedDepartment: { id: departmentId } as any,
            type: AccessRequestType.DEPARTMENT_INCLUSION,
            status: AccessRequestStatus.PENDING,
            reviewedBy: null,
            reviewedAt: null,
        });
        return this.accessRequestRepo.save(request);
    }

    async requestPrimaryDepartmentChange(userId: string, departmentId: string) {
        const user = await this.findById(userId);
        if (user.role !== UserRole.DEV) {
            throw new ConflictException('Apenas usuarios Dev podem solicitar troca de departamento principal.');
        }

        const existingLink = await this.userDeptRepo.findOne({
            where: {
                user: { id: userId },
                department: { id: departmentId } as any,
            },
        });
        if (!existingLink) {
            throw new NotFoundException('Departamento nao esta vinculado ao usuario.');
        }
        if (existingLink.isPrimary) {
            throw new ConflictException('Departamento informado ja e o principal.');
        }

        await this.ensureNoPendingAccessRequest(userId);
        const request = this.accessRequestRepo.create({
            requester: { id: userId } as User,
            requestedRole: null,
            requestedDepartment: { id: departmentId } as any,
            type: AccessRequestType.PRIMARY_DEPARTMENT_CHANGE,
            status: AccessRequestStatus.PENDING,
            reviewedBy: null,
            reviewedAt: null,
        });
        return this.accessRequestRepo.save(request);
    }

    private async hasPrimaryDepartment(userId: string): Promise<boolean> {
        const count = await this.userDeptRepo.count({
            where: {
                user: { id: userId },
                isPrimary: true,
            },
        });
        return count > 0;
    }

    private async ensurePrimaryDepartment(userId: string): Promise<void> {
        const links = await this.userDeptRepo.find({
            where: { user: { id: userId } },
            order: { id: 'ASC' },
        });
        if (links.length === 0 || links.some((link) => link.isPrimary)) {
            return;
        }

        links[0].isPrimary = true;
        await this.userDeptRepo.save(links[0]);
    }

    private async normalizePrimaryDepartment(userId: string, primaryLinkId: string): Promise<void> {
        const links = await this.userDeptRepo.find({
            where: { user: { id: userId } },
        });
        for (const link of links) {
            link.isPrimary = link.id === primaryLinkId;
        }
        await this.userDeptRepo.save(links);
    }

    private async ensureNoPendingAccessRequest(userId: string): Promise<void> {
        const pending = await this.accessRequestRepo.findOne({
            where: {
                requester: { id: userId },
                status: AccessRequestStatus.PENDING,
            },
        });
        if (pending) {
            throw new ConflictException('Ja existe uma solicitacao pendente para este usuario.');
        }
    }
}
