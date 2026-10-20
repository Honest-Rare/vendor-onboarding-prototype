import { Injectable, OnModuleInit } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { config } from '../config.js';
import type { DbClient } from '../platform/database.js';
import { JobsService } from '../platform/jobs.service.js';
import type { Email } from './templates.js';

/** Sends email through a retried background job, so a mail outage never blocks a decision. */
@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly transport = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: false,
  });

  constructor(private readonly jobs: JobsService) {}

  onModuleInit() {
    this.jobs.register('send_email', async (payload: { to: string; subject: string; text: string }) => {
      await this.transport.sendMail({ from: config.mailFrom, to: payload.to, subject: payload.subject, text: payload.text });
    });
  }

  /** Pass `client` to queue the email inside the caller's transaction. */
  async send(to: string, email: Email, client?: DbClient) {
    await this.jobs.enqueue('send_email', { to, subject: email.subject, text: email.text }, client);
  }

  sendToAdmins(email: Email, client?: DbClient) {
    return this.send(config.adminNotifyEmail, email, client);
  }
}
