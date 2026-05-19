import { IsOptional, IsUUID } from 'class-validator';

export class ApproveAccessRequestDto {
    @IsOptional()
    @IsUUID()
    departmentId?: string;
}
