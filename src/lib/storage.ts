import { supabase, isSupabaseConfigured } from './supabase';

const BUCKET_NAME = 'wiki-assets';

/**
 * Upload original PDF or Image file to Supabase Storage
 */
export async function uploadSourceFile(file: File, subjectId: string): Promise<string> {
  const timestamp = Date.now();
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `sources/${subjectId}/${timestamp}_${cleanName}`;

  if (!isSupabaseConfigured) {
    console.warn('Supabase chưa cấu hình. Trả về Blob URL tạm thời.');
    return URL.createObjectURL(file);
  }

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    // If bucket issue or network issue, fallback to blob URL for dev experience
    return URL.createObjectURL(file);
  }

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Upload cropped illustration PNG blob to Supabase Storage (wiki-assets)
 */
export async function uploadCroppedIllustration(
  blob: Blob,
  subjectId: string,
  pageNumber: number,
  index: number
): Promise<string> {
  const timestamp = Date.now();
  const filePath = `illustrations/${subjectId}/${timestamp}_p${pageNumber}_${index}.png`;

  if (!isSupabaseConfigured) {
    return URL.createObjectURL(blob);
  }

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, blob, {
      contentType: 'image/png',
      cacheControl: '86400',
      upsert: true,
    });

  if (error) {
    console.error('Upload cropped illustration error:', error);
    return URL.createObjectURL(blob);
  }

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
  return data.publicUrl;
}
