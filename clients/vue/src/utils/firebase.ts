import { FirebaseStorage, StorageReference, ref } from 'firebase/storage';
import { UploadFor } from '../types';

export function getFileExtension(file: File): string {
  const fileName = file.name;
  const extension = fileName.slice(fileName.lastIndexOf('.') + 1);
  return extension;
}

export function getDestinationRef(
  storage: FirebaseStorage,
  uploadFor: UploadFor,
  owner: string,
  filename: string,
): StorageReference {
  switch (uploadFor) {
    case UploadFor.category:
      return ref(storage, `categories/${filename}`);
    case UploadFor.restaurant:
      return ref(storage, `restaurants/${owner}/gallery/${filename}`);
    case UploadFor.meals:
      return ref(storage, `meals/${owner}/${filename}`);
    case UploadFor.kyc:
      return ref(storage, `kyc/${owner}/documents/${filename}`);
    case UploadFor.menu:
      return ref(storage, `restaurants/${owner}/menus/${filename}`);
    default:
      return ref(storage, `user/${owner}/${filename}`);
  }
}
