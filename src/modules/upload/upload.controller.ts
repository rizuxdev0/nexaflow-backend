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
import { extname, join } from 'path';
import * as fs from 'fs';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';

/**
 * Helper to get vendorId from request for Multer storage
 */
const getVendorId = (req: any): string => {
  const vendorId = req.user?.vendorId || req.headers['x-vendor-id'] || req.query?.vendorId || 'global';
  // Sanitize vendorId to prevent path traversal
  return String(vendorId).replace(/[^a-zA-Z0-9-]/g, '');
};

@ApiTags('upload')
@Controller('upload')
@ApiBearerAuth()
export class UploadController {
  
  @Post('images')
  @ApiOperation({ summary: 'Uploader des images isolées par tenant' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const vendorId = getVendorId(req);
          const uploadPath = `./uploads/${vendorId}/images`;
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
        fileSize: 50 * 1024 * 1024, // 50 MB
      },
    }),
  )
  uploadImages(@UploadedFiles() files: Array<any>, @Req() req: Request) {
    if (!files || files.length === 0) {
      throw new HttpException('Aucun fichier fourni', HttpStatus.BAD_REQUEST);
    }

    const protocol = req.protocol;
    const host = req.get('host');
    const vendorId = getVendorId(req);
    
    const urls = files.map(file => {
      // Retourne l'URL isolée : http://host/uploads/{vendorId}/images/filename.jpg
      return `${protocol}://${host}/uploads/${vendorId}/images/${file.filename}`;
    });

    return { urls };
  }

  @Post('files')
  @ApiOperation({ summary: 'Uploader des fichiers (documents) isolés par tenant' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const vendorId = getVendorId(req);
          const uploadPath = `./uploads/${vendorId}/files`;
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
      limits: {
        fileSize: 50 * 1024 * 1024, // 50 MB
      },
    }),
  )
  uploadFiles(@UploadedFiles() files: Array<any>, @Req() req: Request) {
    if (!files || files.length === 0) {
      throw new HttpException('Aucun fichier fourni', HttpStatus.BAD_REQUEST);
    }

    const protocol = req.protocol;
    const host = req.get('host');
    const vendorId = getVendorId(req);
    
    const urls = files.map(file => {
      return {
        url: `${protocol}://${host}/uploads/${vendorId}/files/${file.filename}`,
        name: file.originalname,
        type: file.mimetype
      };
    });

    return { urls };
  }
}
