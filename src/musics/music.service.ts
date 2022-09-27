import { readFileSync } from 'fs'

import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { File } from '../entity/file.entity'
import { S3Service } from '../s3/s3.service'

@Injectable()
export class MusicService {
    constructor(
        @InjectRepository(File)
        private fileRepository: Repository<File>,
        private s3Service: S3Service,
    ) {}

    async moveFilesToS3(): Promise<void> {
        const files = await this.fileRepository.find()
        for (const file of files) {
            const path = file.path.slice(9)
            await this.s3Service.putObject(path, readFileSync(file.path))

            await this.fileRepository.save({ ...file, path: path })
        }
    }
}
