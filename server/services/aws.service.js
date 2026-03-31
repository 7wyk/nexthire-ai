/**
 * aws.service.js
 * Abstraction layer for all AWS S3 operations.
 * Uses @aws-sdk/client-s3 v3 (modular, tree-shakeable).
 *
 * Required env vars:
 *   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
 *   AWS_REGION, AWS_S3_BUCKET
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuid } from 'uuid'
import path from 'path'
import fs from 'fs'
import logger from '../config/logger.js'

// ── S3 client (singleton) ──────────────────────────────────────────────────
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

// Support both AWS_BUCKET_NAME (task spec) and AWS_S3_BUCKET (legacy)
const BUCKET = process.env.AWS_BUCKET_NAME || process.env.AWS_S3_BUCKET

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Determine MIME type from file extension
 */
const getMimeType = (filename) => {
  const ext = path.extname(filename).toLowerCase()
  const map = {
    '.pdf':  'application/pdf',
    '.doc':  'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt':  'text/plain',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
  }
  return map[ext] || 'application/octet-stream'
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Upload a file buffer or local file path to S3.
 *
 * @param {Object} options
 * @param {Buffer|string} options.source   - Buffer or absolute file path
 * @param {string}        options.filename - Original filename (for MIME + extension)
 * @param {string}        options.folder   - S3 folder prefix (e.g. 'resumes', 'avatars')
 * @param {boolean}      [options.isPublic] - Make object publicly readable (default false)
 * @returns {{ key: string, url: string }} S3 key and public URL (if public) or empty url
 */
export const uploadToS3 = async ({ source, filename, folder = 'uploads', isPublic = false }) => {
  try {
    const ext = path.extname(filename)
    const key = `${folder}/${uuid()}${ext}`

    const body = Buffer.isBuffer(source)
      ? source
      : fs.readFileSync(source)

    const params = {
      Bucket:      BUCKET,
      Key:         key,
      Body:        body,
      ContentType: getMimeType(filename),
      ...(isPublic && { ACL: 'public-read' }),
    }

    await s3.send(new PutObjectCommand(params))

    const url = isPublic
      ? `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
      : ''

    logger.info('[S3] Uploaded file', { key, folder, isPublic })
    return { key, url }
  } catch (err) {
    logger.error('[S3] Upload failed', { error: err.message, filename })
    throw new Error(`S3 upload failed: ${err.message}`)
  }
}

/**
 * Generate a pre-signed URL to allow temporary access to a private S3 object.
 *
 * @param {string} key         - S3 object key
 * @param {number} expiresIn   - Seconds until URL expires (default 1 hour)
 * @returns {string}           - Pre-signed URL
 */
export const getSignedDownloadUrl = async (key, expiresIn = 3600) => {
  try {
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: key })
    const url = await getSignedUrl(s3, command, { expiresIn })
    logger.info('[S3] Generated signed URL', { key, expiresIn })
    return url
  } catch (err) {
    logger.error('[S3] Signed URL generation failed', { error: err.message, key })
    throw new Error(`S3 signed URL failed: ${err.message}`)
  }
}

/**
 * Delete an object from S3.
 *
 * @param {string} key - S3 object key
 */
export const deleteFromS3 = async (key) => {
  if (!key) return
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
    logger.info('[S3] Deleted object', { key })
  } catch (err) {
    logger.error('[S3] Delete failed', { error: err.message, key })
    // Non-blocking — log but don't throw
  }
}

/**
 * Check if an object exists in S3.
 *
 * @param {string} key - S3 object key
 * @returns {boolean}
 */
export const existsInS3 = async (key) => {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }))
    return true
  } catch {
    return false
  }
}

/**
 * List objects in a folder/prefix.
 *
 * @param {string} prefix - e.g. 'resumes/'
 * @returns {Array<{ key: string, size: number, lastModified: Date }>}
 */
export const listS3Objects = async (prefix = '') => {
  try {
    const response = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
    }))
    return (response.Contents || []).map(obj => ({
      key:          obj.Key,
      size:         obj.Size,
      lastModified: obj.LastModified,
    }))
  } catch (err) {
    logger.error('[S3] List failed', { error: err.message, prefix })
    return []
  }
}

export default { uploadToS3, getSignedDownloadUrl, deleteFromS3, existsInS3, listS3Objects }
