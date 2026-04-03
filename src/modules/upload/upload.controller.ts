import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFiles,
  HttpException,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';

@ApiTags('upload')
@Controller('upload')
@ApiBearerAuth()
export class UploadController {
  @Post('images')
  @ApiOperation({ summary: 'Uploader des images' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = './uploads/images';
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(
            new HttpException('Seules les images sont autorisées', HttpStatus.BAD_REQUEST),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB
      },
    }),
  )
  uploadImages(@UploadedFiles() files: Array<any>, @Req() req: Request) {
    if (!files || files.length === 0) {
      throw new HttpException('Aucun fichier fourni', HttpStatus.BAD_REQUEST);
    }

    const protocol = req.protocol;
    const host = req.get('host');
    
    const urls = files.map(file => {
      // Retourne l'URL complète : http://localhost:3003/uploads/images/filename.jpg
      return `${protocol}://${host}/uploads/images/${file.filename}`;
    });

    return { urls };
  }
}
