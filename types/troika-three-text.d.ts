declare module 'troika-three-text' {
  import { Object3D } from 'three';
  
  export class Text extends Object3D {
    text: string;
    fontSize: number;
    color: number;
    anchorX: string | number;
    anchorY: string | number;
    maxWidth?: number;
    sync(): void;
  }
  export default Text;
}

