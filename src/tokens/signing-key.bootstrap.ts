import { Injectable, OnModuleInit } from '@nestjs/common';
import { SigningKeyService } from './services/signing-key.service.js';

@Injectable()
export class SigningKeyBootstrap implements OnModuleInit {
  constructor(private readonly signingKeyService: SigningKeyService) {}
  async onModuleInit() {
    await this.signingKeyService.createInitialKey();
  }
}
