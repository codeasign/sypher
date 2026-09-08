const COVER_WIDTH = 1600;
const COVER_HEIGHT = 800;
const COVER_ASPECT_RATIO = COVER_WIDTH / COVER_HEIGHT;

/**
 * Normalizes a course cover once before upload. The source keeps its natural
 * proportions and is center-cropped into the same 2:1 frame used by the UI.
 */
export async function prepareCourseCover(file: File): Promise<File> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    throw new Error('Choose a PNG, JPEG, or WebP cover image.');
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('The selected cover image could not be read.');
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = COVER_WIDTH;
    canvas.height = COVER_HEIGHT;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Cover image processing is unavailable.');

    const sourceRatio = bitmap.width / bitmap.height;
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = bitmap.width;
    let sourceHeight = bitmap.height;

    if (sourceRatio > COVER_ASPECT_RATIO) {
      sourceWidth = bitmap.height * COVER_ASPECT_RATIO;
      sourceX = (bitmap.width - sourceWidth) / 2;
    } else if (sourceRatio < COVER_ASPECT_RATIO) {
      sourceHeight = bitmap.width / COVER_ASPECT_RATIO;
      sourceY = (bitmap.height - sourceHeight) / 2;
    }

    if (sourceWidth < COVER_WIDTH || sourceHeight < COVER_HEIGHT) {
      throw new Error('Course covers must be at least 1600 x 800 pixels after cropping to 2:1.');
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      bitmap,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      COVER_WIDTH,
      COVER_HEIGHT,
    );

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error('The cover image could not be resized.'));
      }, 'image/png');
    });

    const baseName = file.name
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-z0-9_-]+/gi, '-')
      .replace(/^-+|-+$/g, '') || 'course-cover';

    return new File([blob], `${baseName}-1600x800.png`, {
      type: 'image/png',
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}
