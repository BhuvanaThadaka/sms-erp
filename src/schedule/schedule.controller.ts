import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { CreateScheduleDto, RescheduleDto } from './dto/schedule.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/public.decorator';
import { Role } from '../common/enums';

@Controller('schedule')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Post()
  @Roles(Role.ADMIN, Role.TEACHER)
  create(@Body() dto: CreateScheduleDto, @CurrentUser('userId') userId: string) {
    return this.scheduleService.create(dto, userId);
  }

  @Get('class/:classId')
  findByClass(@Param('classId') classId: string, @Query('academicYear') academicYear?: string) {
    return this.scheduleService.findByClass(classId, academicYear);
  }

  @Get('teacher/:teacherId')
  @Roles(Role.ADMIN, Role.TEACHER)
  findByTeacher(@Param('teacherId') teacherId: string, @Query('academicYear') academicYear?: string) {
    return this.scheduleService.findByTeacher(teacherId, academicYear);
  }

  @Get('my')
  @Roles(Role.TEACHER)
  mySchedule(@CurrentUser('userId') userId: string, @Query('academicYear') academicYear?: string) {
    return this.scheduleService.findByTeacher(userId, academicYear);
  }

  @Patch(':id/reschedule')
  @Roles(Role.ADMIN, Role.TEACHER)
  reschedule(@Param('id') id: string, @Body() dto: RescheduleDto, @CurrentUser('userId') userId: string) {
    return this.scheduleService.reschedule(id, dto, userId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  delete(@Param('id') id: string) {
    return this.scheduleService.delete(id);
  }
}
