import { UserRole } from '@common/enums/user-role.enum';
import { AccessRequestService } from './access-request.service';
import { AccessRequestStatus } from './enums/access-request-status.enum';
import { AccessRequestType } from './enums/access-request-type.enum';

function repoMock() {
    return {
        find: jest.fn(),
        findOne: jest.fn(),
        count: jest.fn(),
        create: jest.fn((value) => value),
        save: jest.fn((value) => Promise.resolve(value)),
        delete: jest.fn(),
        update: jest.fn(),
    };
}

describe('AccessRequestService department approvals', () => {
    function makeService() {
        const accessRequestRepo = repoMock();
        const userRepo = repoMock();
        const userDepartmentRepo = repoMock();
        const departmentRepo = repoMock();

        const service = new AccessRequestService(
            accessRequestRepo as any,
            userRepo as any,
            userDepartmentRepo as any,
            departmentRepo as any,
        );

        return { service, accessRequestRepo, userDepartmentRepo, departmentRepo, userRepo };
    }

    it('approves department inclusion as a secondary department', async () => {
        const { service, accessRequestRepo, userDepartmentRepo } = makeService();
        const request = {
            id: 'request-1',
            type: AccessRequestType.DEPARTMENT_INCLUSION,
            status: AccessRequestStatus.PENDING,
            requester: { id: 'user-1', role: UserRole.DEV },
            requestedDepartment: { id: 'dept-1' },
        };

        accessRequestRepo.findOne.mockResolvedValue(request);
        userDepartmentRepo.findOne.mockResolvedValue(null);
        userDepartmentRepo.count.mockResolvedValue(1);
        userDepartmentRepo.find.mockResolvedValue([
            { id: 'link-0', department: { id: 'dept-0' }, isPrimary: true },
            { id: 'link-1', department: { id: 'dept-1' }, isPrimary: false },
        ]);
        userDepartmentRepo.save.mockImplementation((value) => Promise.resolve(value));

        await service.approve('request-1', 'reviewer-1');

        expect(userDepartmentRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({
                user: { id: 'user-1' },
                department: { id: 'dept-1' },
                isPrimary: false,
            }),
        );
        expect(accessRequestRepo.save).toHaveBeenCalledWith(
            expect.objectContaining({
                status: AccessRequestStatus.APPROVED,
                reviewedBy: { id: 'reviewer-1' },
            }),
        );
    });

    it('approves primary department changes by switching isPrimary only', async () => {
        const { service, accessRequestRepo, userDepartmentRepo } = makeService();
        const request = {
            id: 'request-2',
            type: AccessRequestType.PRIMARY_DEPARTMENT_CHANGE,
            status: AccessRequestStatus.PENDING,
            requester: { id: 'user-1', role: UserRole.DEV },
            requestedDepartment: { id: 'dept-2' },
        };
        const links = [
            { id: 'link-1', department: { id: 'dept-1' }, isPrimary: true },
            { id: 'link-2', department: { id: 'dept-2' }, isPrimary: false },
        ];

        accessRequestRepo.findOne.mockResolvedValue(request);
        userDepartmentRepo.find.mockResolvedValue(links);

        await service.approve('request-2', 'reviewer-1');

        expect(userDepartmentRepo.save).toHaveBeenCalledWith([
            expect.objectContaining({ id: 'link-1', isPrimary: false }),
            expect.objectContaining({ id: 'link-2', isPrimary: true }),
        ]);
        expect(accessRequestRepo.save).toHaveBeenCalledWith(
            expect.objectContaining({ status: AccessRequestStatus.APPROVED }),
        );
    });
});
