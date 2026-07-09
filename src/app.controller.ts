import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  getHealthCheck() {
    return {
      success: true,
      message: 'StudioBook API is running',
    };
  }
}
