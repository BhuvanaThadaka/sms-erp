import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
  ) {}

  async create(data: {
    userId: string | Types.ObjectId;
    title: string;
    message: string;
    type: string;
    data?: any;
  }): Promise<NotificationDocument> {
    const notification = new this.notificationModel(data);
    return notification.save();
  }

  async createMany(data: any[]): Promise<any> {
    console.log(`NotificationsService.createMany called with ${data.length} items`);
    if (data.length > 0) {
      console.log(`First notification: ${JSON.stringify(data[0])}`);
    }
    const result = await this.notificationModel.insertMany(data);
    console.log(`NotificationsService.createMany saved ${result.length} items`);
    return result;
  }

  async findAllForUser(userId: string): Promise<NotificationDocument[]> {
    return this.notificationModel
      .find({ userId: new Types.ObjectId(userId), isRead: false })
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();
  }

  async findAllNotificationsForUser(userId: string): Promise<NotificationDocument[]> {
    return this.notificationModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(100)
      .exec();
  }

  async markAsRead(id: string, userId: string): Promise<NotificationDocument> {
    const notification = await this.notificationModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
      { $set: { isRead: true } },
      { new: true },
    );
    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  async markAllAsRead(userId: string): Promise<{ modifiedCount: number }> {
    const result = await this.notificationModel.updateMany(
      { userId: new Types.ObjectId(userId), isRead: false },
      { $set: { isRead: true } },
    );
    return { modifiedCount: result.modifiedCount };
  }

  async delete(id: string, userId: string): Promise<{ message: string }> {
    const result = await this.notificationModel.deleteOne({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    });
    if (result.deletedCount === 0) throw new NotFoundException('Notification not found');
    return { message: 'Notification deleted' };
  }
}
