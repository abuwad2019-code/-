export interface ProcessedFile {
  name: string;
  data: Uint8Array;
  type: string;
}

export enum AppMode {
  ENCRYPT = 'ENCRYPT',
  DECRYPT = 'DECRYPT'
}

export interface StegoError {
  message: string;
  code: 'CAPACITY_OVERFLOW' | 'INVALID_IMAGE' | 'NO_DATA_FOUND' | 'UNKNOWN';
}
