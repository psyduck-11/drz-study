import { supabase, isSupabaseConfigured } from './supabase';

const BUCKET_NAME = 'wiki-assets';

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Không thể chuyển đổi ảnh sang Data URL'));
      }
    };
    reader.onerror = () => reject(new Error('Lỗi đọc dữ liệu ảnh'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Upload original PDF or Image file to Supabase Storage
 */
export async function uploadSourceFile(
  file: File,
  subjectId: string,
  useSupabase: boolean = isSupabaseConfigured
): Promise<string> {
  const timestamp = Date.now();
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `sources/${subjectId}/${timestamp}_${cleanName}`;

  if (!useSupabase) {
    return URL.createObjectURL(file);
  }

  try {
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      console.warn('Storage upload fallback to local Blob URL:', uploadError.message);
      return URL.createObjectURL(file);
    }

    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
    return data.publicUrl;
  } catch (err) {
    console.warn('Storage upload error, falling back to Blob URL:', err);
    return URL.createObjectURL(file);
  }
}

/**
 * Upload cropped illustration PNG blob to Supabase Storage (wiki-assets)
 */
export async function uploadCroppedIllustration(
  blob: Blob,
  subjectId: string,
  pageNumber: number,
  index: number,
  useSupabase: boolean = isSupabaseConfigured
): Promise<string> {
  const timestamp = Date.now();
  const filePath = `illustrations/${subjectId}/${timestamp}_p${pageNumber}_${index}.png`;

  if (!useSupabase) {
    return blobToDataUrl(blob);
  }

  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, blob, {
        contentType: 'image/png',
        cacheControl: '86400',
        upsert: true,
      });

    if (error) {
      console.warn('Upload cropped illustration fallback to Data URL:', error.message);
      return blobToDataUrl(blob);
    }

    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
    return data.publicUrl;
  } catch (err) {
    console.warn('Upload cropped illustration error, falling back to Data URL:', err);
    return blobToDataUrl(blob);
  }
}
