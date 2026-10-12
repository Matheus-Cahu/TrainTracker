// There is no file system on web: the image itself is kept as a data URI and
// that string is what gets stored as the reference.

export function imageUri(name: string) {
  return name;
}

export async function persistImage(sourceUri: string) {
  if (sourceUri.startsWith('data:')) return sourceUri;
  const blob = await (await fetch(sourceUri)).blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function deleteImage(_name: string) {}
