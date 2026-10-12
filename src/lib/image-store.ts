import { Directory, File, Paths } from 'expo-file-system';

// Only file names are stored in the database: the absolute path of the document
// directory can change between app updates on iOS.
const imagesDir = () => new Directory(Paths.document, 'images');

/** Resolves a stored image reference to a URI that can be displayed. */
export function imageUri(name: string) {
  return new File(imagesDir(), name).uri;
}

/** Copies a picked image into the app's storage and returns the reference to store. */
export async function persistImage(sourceUri: string) {
  const dir = imagesDir();
  dir.create({ intermediates: true, idempotent: true });
  const source = new File(sourceUri);
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${source.extension || '.jpg'}`;
  await source.copy(new File(dir, name));
  return name;
}

export function deleteImage(name: string) {
  try {
    const file = new File(imagesDir(), name);
    if (file.exists) file.delete();
  } catch (error) {
    console.warn('Failed to delete image', name, error);
  }
}
