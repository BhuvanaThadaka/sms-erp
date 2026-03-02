import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CreateClassDto, UpdateClassDto, AssignTeacherDto } from './dto/class.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/public.decorator';
import { Role } from '../common/enums';

@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateClassDto, @CurrentUser('userId') userId: string) {
    return this.classesService.create(dto, userId);
  }

  @Get()
  findAll(@Query('academicYear') academicYear?: string, @CurrentUser() user?: any) {
    if (user.role === Role.TEACHER) {
      return this.classesService.getTeacherClasses(user.userId);
    }
    return this.classesService.findAll(academicYear);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.classesService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateClassDto) {
    return this.classesService.update(id, dto);
  }

  @Post(':id/assign-teacher')
  @Roles(Role.ADMIN)
  assignTeacher(@Param('id') id: string, @Body() dto: AssignTeacherDto) {
    return this.classesService.assignTeacher(id, dto.teacherId);
  }
}
