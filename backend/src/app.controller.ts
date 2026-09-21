import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      servicio: 'heavycult-api',
      timestamp: new Date().toISOString(),
    };
  }
}
