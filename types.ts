export interface AudioData {
  bass: number;
  mid: number;
  high: number;
  volume: number;
  dataArray: Uint8Array;
}

export enum AudioSourceType {
  MICROPHONE = 'MICROPHONE',
  FILE = 'FILE'
}
