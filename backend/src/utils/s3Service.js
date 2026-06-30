import { S3Client, GetObjectCommand, DeleteObjectCommand, PutObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Perform a multipart upload of a file buffer/stream to AWS S3.
 * Automatically handles files up to 1GB using multipart chunking.
 * 
 * @param {Buffer|ReadableStream} fileData - The file data
 * @param {string} key - S3 object key (e.g. "study-materials/unique-file-name.pdf")
 * @param {string} mimeType - The file mime type
 * @returns {Promise<object>} Upload result details
 */
export const uploadToS3 = async (fileData, key, mimeType) => {
  try {
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Body: fileData,
        ContentType: mimeType,
      },
      // Configure chunk sizes and concurrency for large files (e.g. 5MB chunks)
      partSize: 5 * 1024 * 1024,
      queueSize: 4,
    });

    upload.on('httpUploadProgress', (progress) => {
      console.log(`[S3 Upload Progress] ${key}: ${progress.loaded}/${progress.total} bytes uploaded`);
    });

    const result = await upload.done();
    console.log(`[S3 Upload Success] Key: ${key}`);
    return result;
  } catch (error) {
    console.error('[S3 Upload Error]', error);
    throw error;
  }
};

/**
 * Generate a pre-signed download URL for a private S3 object.
 * 
 * @param {string} key - S3 object key
 * @returns {Promise<string>} Pre-signed URL (valid for 10 minutes)
 */
export const getPresignedDownloadUrl = async (key) => {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    });
    // expires in 10 minutes (600 seconds)
    const url = await getSignedUrl(s3Client, command, { expiresIn: 600 });
    return url;
  } catch (error) {
    console.error('[S3 Pre-signed URL Error]', error);
    throw error;
  }
};

/**
 * Delete an object from AWS S3.
 * 
 * @param {string} key - S3 object key
 * @returns {Promise<object>} Delete result
 */
export const deleteFromS3 = async (key) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    });
    const result = await s3Client.send(command);
    console.log(`[S3 Delete Success] Key: ${key}`);
    return result;
  } catch (error) {
    console.error('[S3 Delete Error]', error);
    throw error;
  }
};

/**
 * Generate a pre-signed S3 upload URL for direct client-side uploads.
 * 
 * @param {string} key - S3 object key
 * @param {string} mimeType - File mime type
 * @returns {Promise<string>} Pre-signed upload URL (expires in 15 minutes)
 */
export const getUploadPresignedUrl = async (key, mimeType) => {
  try {
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      ContentType: mimeType,
    });
    // URL expires in 15 minutes (900 seconds)
    const url = await getSignedUrl(s3Client, command, { expiresIn: 900 });
    return url;
  } catch (error) {
    console.error('[S3 Pre-signed Upload URL Error]', error);
    throw error;
  }
};

/**
 * Initiate an S3 multipart upload.
 */
export const initiateMultipart = async (key, mimeType) => {
  try {
    const command = new CreateMultipartUploadCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      ContentType: mimeType,
    });
    const res = await s3Client.send(command);
    return res.UploadId;
  } catch (error) {
    console.error('[S3 Initiate Multipart Error]', error);
    throw error;
  }
};

/**
 * Generate a pre-signed URL for a specific part in a multipart upload.
 */
export const presignUploadPart = async (key, uploadId, partNumber) => {
  try {
    const command = new UploadPartCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });
    // URL expires in 15 minutes (900 seconds)
    const url = await getSignedUrl(s3Client, command, { expiresIn: 900 });
    return url;
  } catch (error) {
    console.error('[S3 Presign Part Error]', error);
    throw error;
  }
};

/**
 * Complete a multipart upload, joining all parts together.
 * @param {string} key - S3 Key
 * @param {string} uploadId - S3 Upload ID
 * @param {Array<{PartNumber: number, ETag: string}>} parts - Uploaded parts list
 */
export const completeMultipart = async (key, uploadId, parts) => {
  try {
    const command = new CompleteMultipartUploadCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts },
    });
    const res = await s3Client.send(command);
    return res;
  } catch (error) {
    console.error('[S3 Complete Multipart Error]', error);
    throw error;
  }
};

/**
 * Abort a multipart upload to clean up S3 storage.
 */
export const abortMultipart = async (key, uploadId) => {
  try {
    const command = new AbortMultipartUploadCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
    });
    await s3Client.send(command);
  } catch (error) {
    console.error('[S3 Abort Multipart Error]', error);
  }
};
