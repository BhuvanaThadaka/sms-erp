import {
  Controller, Get, Post, Body, Patch, Delete, Param, Query, UseGuards,
} from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto, UpdateSubjectDto } from './dto/subject.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/public.decorator';
import { Role } from '../common/enums';

@Controller('subjects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateSubjectDto, @CurrentUser('userId') userId: string) {
    return this.subjectsService.create(dto, userId);
  }

  @Get()
  async findAll(
    @Query('classId') classId?: string,
    @Query('academicYear') academicYear?: string,
    @CurrentUser() user?: any,
  ) {
    // Teachers see only their subjects
    if (user.role === Role.TEACHER) {
      return this.subjectsService.findByTeacher(user.userId, academicYear);
    }
    return this.subjectsService.findAll({ classId, academicYear });
  }

  @Get('my')
  @Roles(Role.TEACHER)
  async mySubjects(@CurrentUser('userId') userId: string, @Query('academicYear') academicYear?: string) {
    return this.subjectsService.findByTeacher(userId, academicYear);
  }

  @Get('class/:classId')
  async getByClass(@Param('classId') classId: string, @Query('academicYear') academicYear?: string) {
    return this.subjectsService.findAll({ classId, academicYear });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subjectsService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateSubjectDto) {
    return this.subjectsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.subjectsService.delete(id);
  }
}
