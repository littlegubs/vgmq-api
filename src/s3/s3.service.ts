import { Readable } from 'stream'

import {
    GetObjectCommand,
    GetObjectCommandOutput,
    PutObjectCommand,
    PutObjectCommandOutput,
    S3Client,
} from '@aws-sdk/client-s3'
import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class S3Service {
    private client: S3Client
    private bucketName?: string = this.configService.get('AMAZON_S3_BUCKET')
    constructor(private configService: ConfigService) {
        const accessId = this.configService.get('AMAZON_S3_ID')
        const secretKey = this.configService.get('AMAZON_S3_SECRET')
        if (!accessId || !secretKey || !this.bucketName) {
            throw new InternalServerErrorException('missing amazon credentials')
        }
        this.client = new S3Client({
            region: 'eu-west-3',
            credentials: {
                accessKeyId: accessId,
                secretAccessKey: secretKey,
            },
        })
    }

    async putObject(filePath: string, file: Buffer): Promise<PutObjectCommandOutput> {
        return this.client.send(
            new PutObjectCommand({
                Bucket: this.bucketName,
                Key: filePath,
                Body: file,
            }),
        )
    }

    async getObject(filePath: string): Promise<GetObjectCommandOutput> {
        return this.client.send(
            new GetObjectCommand({
                Bucket: this.bucketName,
                Key: filePath,
            }),
        )
    }

    async streamToBuffer(stream: Readable): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const chunks: any[] = []
            stream.on('data', (chunk: any) => {
                chunks.push(chunk)
            })
            stream.on('error', reject)
            stream.on('end', () => resolve(Buffer.concat(chunks)))
        })
    }
}
