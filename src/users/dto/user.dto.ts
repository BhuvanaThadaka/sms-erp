import {
  IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsArray,
  MinLength, MaxLength, Matches, IsDateString, IsMongoId,
} from 'class-validator';
import { Role } from '../../common/enums';

export class CreateUserDto {
  @IsNotEmpty({ message: 'First name is required' })
  @IsString()
  @MaxLength(50, { message: 'First name cannot exceed 50 characters' })
  @Matches(/^[^0-9]+$/, { message: 'First name should not contain numbers' })
  firstName: string;

  @IsNotEmpty({ message: 'Last name is required' })
  @IsString()
  @MaxLength(50, { message: 'Last name cannot exceed 50 characters' })
  @Matches(/^[^0-9]+$/, { message: 'Last name should not contain numbers' })
  lastName: string;

  @IsEmail({}, { message: 'Email must be in a valid format' })
  email: string;

  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string;

  @IsEnum(Role)
  role: Role;

  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  @Matches(/^\d{10}$/, { message: 'Phone number must be exactly 10 digits and contain no alphabets' })
  phone: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsString()
  enrollmentNumber?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsDateString()
  joinDate?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;
}

export class AssignStudentToClassDto {
  @IsNotEmpty()
  @IsMongoId()
  classId: string;
}
