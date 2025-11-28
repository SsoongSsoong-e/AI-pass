import { Controller, Get } from '@nestjs/common';
import { ApiResponse, ApiTags, ApiOperation} from '@nestjs/swagger';
import { AppService } from './app.service';


@ApiTags("app")
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: "서버 상태 확인",
    description: "API 서버가 정상적으로 동작하는지 확인하는 엔드포인트"
  })
  @ApiResponse({
    status: 200,
    description: 'Default API for nest js',
    type: String,
  })
  getHello(): string {
    return this.appService.getHello();
  }

}
