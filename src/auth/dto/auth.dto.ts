import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional, MaxLength, Matches } from 'class-validator';
import { Role } from '../../common/enums';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}

export class RegisterDto {
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
  @IsOptional()
  role?: Role;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  enrollmentNumber?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  @Matches(/^\d{10}$/, { message: 'Phone number must be exactly 10 digits and contain no alphabets' })
  phone: string;
}
