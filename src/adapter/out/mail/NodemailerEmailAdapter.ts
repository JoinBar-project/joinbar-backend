import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import {
  EmailPayload,
  SendEmailPort,
} from '../../../application/port/out/shared/SendEmailPort';
import { getEnv } from '../../../infrastructure/validate-env';

@Injectable()
export class NodemailerEmailAdapter implements SendEmailPort, OnModuleInit {
  private readonly logger = new Logger(NodemailerEmailAdapter.name);
  private transporter: Transporter | null = null;
  private emailFrom = '';

  onModuleInit(): void {
    const env = getEnv();
    const { SMTP_HOST: host, SMTP_USER: user, SMTP_PASS: pass } = env;

    if (!host || !user || !pass) {
      this.logger.warn('[Email] SMTP 憑證未設定，寄信功能將無法使用');
      return;
    }

    this.emailFrom = env.EMAIL_FROM ?? user;
    this.transporter = nodemailer.createTransport({
      host,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: { user, pass },
    });

    this.logger.log('[Email] Nodemailer 初始化完成');
  }

  async sendMail(payload: EmailPayload): Promise<void> {
    if (!this.transporter) {
      throw new Error('SMTP 未初始化');
    }

    await this.transporter.sendMail({
      from: this.emailFrom,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });

    this.logger.log(`[Email] 信件已發送至 ${payload.to}`);
  }
}
