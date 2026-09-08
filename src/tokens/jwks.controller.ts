import { Controller, Get } from '@nestjs/common';

import { JwksService } from './services/jwks.service.js';

@Controller('.well-known')
export class JwksController {
  constructor(private readonly jwksService: JwksService) {}

  @Get('jwks.json')
  async getJwks() {
    return this.jwksService.getJwks();
  }
}
