import { Readable } from 'stream'

import {
    DeleteObjectCommand,
    DeleteObjectCommandOutput,
    GetObjectCommand,
    GetObjectCommandOutput,
    PutObjectCommand,
    PutObjectCommandOutput,
    S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class S3Service {
    private client: S3Client
    private bucketName?: string = this.configService.get('AMAZON_S3_BUCKET')
    private readonly logger = new Logger(S3Service.name)

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

    async putObject(
        filePath: string,
        file: Buffer,
        bucketName?: string,
    ): Promise<PutObjectCommandOutput> {
        return this.client.send(
            new PutObjectCommand({
                Bucket: bucketName ?? this.bucketName,
                Key: filePath,
                Body: file,
            }),
        )
    }

    async getObject(filePath: string): Promise<GetObjectCommandOutput> {
        this.logger.log({ msg: `getting object for ${filePath}`, from: 'getObject' })
        return this.client.send(
            new GetObjectCommand({
                Bucket: this.bucketName,
                Key: filePath,
            }),
        )
    }

    async getSignedUrl(filePath: string): Promise<string> {
        this.logger.log({ msg: `getting signed url for ${filePath}`, from: 'getSignedUrl' })
        return getSignedUrl(
            this.client,
            new GetObjectCommand({
                Bucket: this.bucketName,
                Key: filePath,
            }),
        )
    }

    async deleteObject(filePath: string): Promise<DeleteObjectCommandOutput> {
        return this.client.send(
            new DeleteObjectCommand({
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
