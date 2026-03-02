import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, Query, ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, AssignStudentToClassDto } from './dto/user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/public.decorator';
import { Role } from '../common/enums';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.ADMIN)
  async create(@Body() createUserDto: CreateUserDto, @CurrentUser('userId') userId: string) {
    return this.usersService.create(createUserDto, userId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
  async findAll(@Query('role') role?: Role, @Query('classId') classId?: string) {
    return this.usersService.findAll(role, classId);
  }

  @Get('me')
  async getProfile(@CurrentUser() user: any) {
    return this.usersService.findById(user.userId);
  }

  @Get('class/:classId/students')
  @Roles(Role.ADMIN, Role.TEACHER)
  async getStudentsByClass(@Param('classId') classId: string) {
    return this.usersService.getStudentsByClass(classId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    if (user.role === Role.STUDENT && user.userId !== id) {
      throw new ForbiddenException('You can only view your own profile');
    }
    return this.usersService.findById(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: any,
  ) {
    if (user.role === Role.STUDENT && user.userId !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }
    return this.usersService.update(id, updateUserDto, user.userId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async deactivate(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }

  @Post(':id/assign-class')
  @Roles(Role.ADMIN)
  async assignToClass(@Param('id') id: string, @Body() dto: AssignStudentToClassDto, @CurrentUser('userId') adminId: string) {
    return this.usersService.assignStudentToClass(id, dto.classId, adminId);
  }

  @Post('bulk-assign-class')
  @Roles(Role.ADMIN)
  async bulkAssignToClass(@Body() dto: { studentIds: string[]; classId: string }, @CurrentUser('userId') adminId: string) {
    return this.usersService.bulkAssignStudentsToClass(dto.studentIds, dto.classId, adminId);
  }
}
