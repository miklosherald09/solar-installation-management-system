/**
 * MinIO Service
 * Uploads images and videos to a MinIO bucket.
 *
 * Bucket layout: solarimsys/works/{user-id}/{work-id}/{image-id}
 * The bucket must allow public read access on uploaded objects so
 * clients can display them directly via the generated URL.
 *
 * All URLs and credentials come from the central environment config:
 * src/constants/env.ts — change hosts there, not here.
 */

import { MINIO, MINIO_BASE_URL } from '../constants/env';

export const MINIO_ENDPOINT = MINIO_BASE_URL;
export const BUCKET_NAME = MINIO?.bucket;

export interface UploadResult {
  /** Public URL where the uploaded media can be accessed. */
  url: string;
  /** The object key inside the bucket. */
  key: string;
}

export type UploadInput =
  | string
  | {
      uri?: string;
      type?: string;
      fileName?: string;
    };

/**
 * Checks if a URL, URI, or object key represents a video file.
 */
export function isVideoUrl(urlOrKey: string): boolean {
  if (!urlOrKey) return false;
  const clean = urlOrKey.toLowerCase().split('?')[0];
  if (/\.(mp4|mov|m4v|webm|mkv|3gp|avi|wmv|ts)$/i.test(clean)) {
    return true;
  }
  if (
    clean.includes('/video/') ||
    clean.includes('video%3a') ||
    clean.includes('video_') ||
    clean.startsWith('content://media/external/video')
  ) {
    return true;
  }
  return false;
}

/**
 * Extracts normalized file info (uri, clean extension, MIME type, and fileName)
 * handling Android camera captures, content URIs, and gallery assets.
 */
export function detectMediaMeta(input: UploadInput): {
  uri: string;
  ext: string;
  mimeType: string;
  isVideo: boolean;
  fileName: string;
} {
  const uri = typeof input === 'string' ? input : input.uri || '';
  const type = typeof input === 'string' ? '' : input.type || '';
  const inputFileName = typeof input === 'string' ? '' : input.fileName || '';

  const cleanUri = uri.split('?')[0];
  const cleanUriLower = cleanUri.toLowerCase();

  const isVideoByType = type.toLowerCase().startsWith('video/');

  const fileNameExt = inputFileName.includes('.')
    ? inputFileName.split('.').pop()?.toLowerCase()
    : '';

  const lastSlash = cleanUri.lastIndexOf('/');
  const lastDot = cleanUri.lastIndexOf('.');
  const uriExt =
    lastDot > lastSlash ? cleanUri.slice(lastDot + 1).toLowerCase() : '';

  const videoExtensions = ['mp4', 'mov', 'm4v', 'webm', 'mkv', '3gp', 'avi'];
  const imageExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

  const isVideoByUri =
    cleanUriLower.includes('/video/') ||
    cleanUriLower.includes('video%3a') ||
    cleanUriLower.includes('video_') ||
    cleanUriLower.startsWith('content://media/external/video');

  const isVideo =
    isVideoByType ||
    isVideoByUri ||
    (fileNameExt ? videoExtensions.includes(fileNameExt) : false) ||
    (uriExt ? videoExtensions.includes(uriExt) : false);

  let ext = 'jpg';
  if (isVideo) {
    if (fileNameExt && videoExtensions.includes(fileNameExt)) {
      ext = fileNameExt;
    } else if (uriExt && videoExtensions.includes(uriExt)) {
      ext = uriExt;
    } else if (type === 'video/quicktime' || cleanUriLower.endsWith('.mov')) {
      ext = 'mov';
    } else {
      ext = 'mp4';
    }
  } else {
    if (fileNameExt && imageExtensions.includes(fileNameExt)) {
      ext = fileNameExt === 'jpeg' ? 'jpg' : fileNameExt;
    } else if (uriExt && imageExtensions.includes(uriExt)) {
      ext = uriExt === 'jpeg' ? 'jpg' : uriExt;
    } else if (type.includes('png')) {
      ext = 'png';
    } else if (type.includes('webp')) {
      ext = 'webp';
    } else {
      ext = 'jpg';
    }
  }

  const mimeType = isVideo
    ? ext === 'mov'
      ? 'video/quicktime'
      : 'video/mp4'
    : `image/${ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : 'jpeg'}`;

  const fileName = inputFileName || `${Date.now()}.${ext}`;

  return { uri, ext, mimeType, isVideo, fileName };
}

/**
 * Low-level MinIO PUT upload shared by all media upload helpers.
 */
async function putObjectToMinio(
  filePath: string,
  key: string,
  explicitMimeType?: string,
  explicitFileName?: string,
): Promise<UploadResult> {
  const publicUrl = `${MINIO_BASE_URL}/${key}`;

  const ext = (key.split('.').pop() || 'jpg').toLowerCase();
  const isVideo = ['mp4', 'mov', 'm4v', 'webm', 'mkv', '3gp', 'avi'].includes(
    ext,
  );
  const fileType =
    explicitMimeType ||
    (isVideo
      ? ext === 'mov'
        ? 'video/quicktime'
        : 'video/mp4'
      : `image/${ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : 'jpeg'}`);
  const fileName =
    explicitFileName || key.split('/').pop() || `${Date.now()}.${ext}`;

  // Use XMLHttpRequest which natively handles local file URIs in React Native.
  const result = await new Promise<XMLHttpRequest>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      'PUT',
      `${publicUrl}?AccessKeyId=${MINIO.accessKey}&SecretAccessKey=${MINIO.secretKey}`,
      true,
    );
    xhr.setRequestHeader('Content-Type', fileType);
    xhr.timeout = 60000; // 60s timeout for media uploads

    xhr.onload = () => resolve(xhr);
    xhr.onerror = () => reject(new Error('Network request failed'));
    xhr.ontimeout = () => reject(new Error('Upload timed out'));

    // React Native's XHR.send() accepts a file object { uri, type, name }
    // and reads the local file from disk automatically.
    xhr.send({ uri: filePath, type: fileType, name: fileName });
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(
      `MinIO upload failed: ${result.status} — ${
        result.responseText || result.statusText
      }`,
    );
  }

  return { url: publicUrl, key };
}

/**
 * Upload a single work media item (photo or video) to MinIO.
 */
export async function uploadImageToMinio(
  fileInput: UploadInput,
  userId: string,
  workId: string,
  imageId: string,
): Promise<UploadResult> {
  const { uri, ext, mimeType, fileName } = detectMediaMeta(fileInput);
  if (!uri) {
    throw new Error('No URI provided for upload');
  }
  const key = `works/${userId}/${workId}/${imageId}.${ext}`;
  return putObjectToMinio(uri, key, mimeType, fileName);
}

/**
 * Upload a user's profile picture to MinIO.
 */
export async function uploadProfilePicture(
  fileInput: UploadInput,
  userId: string,
): Promise<UploadResult> {
  const { uri, ext, mimeType, fileName } = detectMediaMeta(fileInput);
  const key = `users/${userId}/profile/${Date.now()}.${ext}`;
  return putObjectToMinio(uri, key, mimeType, fileName);
}

/**
 * Upload a chat attachment (photo or video) to MinIO.
 */
export async function uploadChatAttachment(
  fileInput: UploadInput,
  userId: string,
  conversationId: string,
): Promise<UploadResult> {
  const { uri, ext, mimeType, fileName } = detectMediaMeta(fileInput);
  const key = `chats/${conversationId}/${userId}/${Date.now()}.${ext}`;
  return putObjectToMinio(uri, key, mimeType, fileName);
}

/**
 * Build the public URL for a stored MinIO object key.
 */
export function getImageUrl(key: string): string {
  return `${MINIO_BASE_URL}/${key}`;
}

/**
 * Upload multiple images/videos sequentially and return their keys (not full URLs).
 */
export async function uploadImages(
  fileInputs: UploadInput[],
  userId: string,
  workId: string,
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  for (let i = 0; i < fileInputs.length; i++) {
    const imageId = `${Date.now()}-${i}`;
    const result = await uploadImageToMinio(
      fileInputs[i],
      userId,
      workId,
      imageId,
    );
    results.push(result);
  }
  return results;
}
