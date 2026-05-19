import { UserRole } from '@common/enums/user-role.enum';
import { AccessRequestStatus } from '@modules/access-request/enums/access-request-status.enum';
import { AccessRequestType } from '@modules/access-request/enums/access-request-type.enum';
import { UserService } from './user.service';

function repoMock() {
    return {
        find: jest.fn(),
        findOne: jest.fn(),
        findOneOrFail: jest.fn(),
        count: jest.fn(),
        create: jest.fn((value) => value),
        save: jest.fn((value) => Promise.resolve(value)),
        delete: jest.fn(),
        update: jest.fn(),
        remove: jest.fn(),
        createQueryBuilder: jest.fn(() => ({
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            execute: jest.fn(),
        })),
    };
}

describe('UserService department links', () => {
    function makeService() {
        const userRepo = repoMock();
        const userDeptRepo = repoMock();
        const accessRequestRepo = repoMock();
        const ticketRepo = repoMock();
        const articleRepo = repoMock();
        const hashService = { hash: jest.fn(), compare: jest.fn() };

        const service = new UserService(
            userRepo as any,
            userDeptRepo as any,
            accessRequestRepo as any,
            ticketRepo as any,
            articleRepo as any,
            hashService as any,
        );

        return { service, userRepo, userDeptRepo, accessRequestRepo };
    }

    it('marks the first linked department as primary', async () => {
        const { service, userDeptRepo } = makeService();
        const saved = {
            id: 'link-1',
            user: { id: 'user-1' },
            department: { id: 'dept-1' },
            isPrimary: true,
        };

        userDeptRepo.findOne.mockResolvedValue(null);
        userDeptRepo.count.mockResolvedValue(0);
        userDeptRepo.save.mockResolvedValue(saved);
        userDeptRepo.find.mockResolvedValue([saved]);
        userDeptRepo.findOneOrFail.mockResolvedValue(saved);

        await service.linkDepartment('user-1', 'dept-1');

        expect(userDeptRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({ isPrimary: true }),
        );
        expect(userDeptRepo.save).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({ id: 'link-1', isPrimary: true })]),
        );
    });

    it('keeps only one primary department when changing primary', async () => {
        const { service, userDeptRepo } = makeService();
        const links = [
            { id: 'link-1', department: { id: 'dept-1' }, isPrimary: true },
            { id: 'link-2', department: { id: 'dept-2' }, isPrimary: false },
        ];

        userDeptRepo.find.mockResolvedValue(links);
        userDeptRepo.findOneOrFail.mockResolvedValue(links[1]);

        await service.setPrimaryDepartment('user-1', 'dept-2');

        expect(userDeptRepo.save).toHaveBeenCalledWith([
            expect.objectContaining({ id: 'link-1', isPrimary: false }),
            expect.objectContaining({ id: 'link-2', isPrimary: true }),
        ]);
    });

    it('creates a pending department inclusion request without linking immediately', async () => {
        const { service, userRepo, userDeptRepo, accessRequestRepo } = makeService();

        userRepo.findOne.mockResolvedValue({ id: 'user-1', role: UserRole.DEV });
        userDeptRepo.findOne.mockResolvedValue(null);
        accessRequestRepo.findOne.mockResolvedValue(null);
        accessRequestRepo.save.mockImplementation((value) => Promise.resolve(value));

        await service.requestDepartmentInclusion('user-1', 'dept-1');

        expect(accessRequestRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({
                type: AccessRequestType.DEPARTMENT_INCLUSION,
                status: AccessRequestStatus.PENDING,
                requestedDepartment: { id: 'dept-1' },
            }),
        );
        expect(userDeptRepo.save).not.toHaveBeenCalled();
    });
});
