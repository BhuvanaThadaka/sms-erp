import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { CreateSessionDto, UpdateSessionDto } from './dto/session.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/public.decorator';
import { Role } from '../common/enums';

@Controller('sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.TEACHER)
  create(@Body() dto: CreateSessionDto, @CurrentUser('userId') userId: string) {
    return this.sessionsService.create(dto, userId);
  }

  @Get()
  findAll(
    @Query('classId') classId?: string,
    @Query('teacherId') teacherId?: string,
    @Query('academicYear') academicYear?: string,
    @CurrentUser() user?: any,
  ) {
    if (user.role === Role.TEACHER) teacherId = user.userId;
    return this.sessionsService.findAll(classId, teacherId, academicYear);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sessionsService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  update(@Param('id') id: string, @Body() dto: UpdateSessionDto, @CurrentUser('userId') userId: string) {
    return this.sessionsService.update(id, dto, userId);
  }
}
