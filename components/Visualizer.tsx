import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { vertexShader, fragmentShader } from '../shaders';
import { AudioData } from '../types';

interface VisualizerProps {
  audioData: AudioData;
  isPlaying: boolean;
}

const Visualizer = forwardRef<HTMLCanvasElement, VisualizerProps>(({ audioData, isPlaying }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const requestRef = useRef<number>();
  const startTimeRef = useRef<number>(Date.now());

  // Expose the canvas ref to parent via forwardRef
  useImperativeHandle(ref, () => canvasRef.current!);

  // Initialize Three.js
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    cameraRef.current = camera;

    // Renderer setup using existing canvas
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current,
      antialias: false, 
      powerPreference: "high-performance",
      preserveDrawingBuffer: true // Required for MediaRecorder to capture the buffer
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // Shader Material
    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(width, height) },
      uBass: { value: 0.0 },
      uMid: { value: 0.0 },
      uHigh: { value: 0.0 },
      uVolume: { value: 0.0 },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
    });
    materialRef.current = material;

    // Full screen plane
    const geometry = new THREE.PlaneGeometry(2, 2);
    const plane = new THREE.Mesh(geometry, material);
    scene.add(plane);

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !materialRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      rendererRef.current.setSize(w, h);
      materialRef.current.uniforms.uResolution.value.set(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      rendererRef.current?.dispose();
    };
  }, []);

  // Render Loop
  useEffect(() => {
    const animate = () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current || !materialRef.current) return;

      const currentTime = (Date.now() - startTimeRef.current) * 0.001;
      
      const uniforms = materialRef.current.uniforms;
      uniforms.uTime.value = currentTime;
      uniforms.uBass.value = audioData.bass / 255.0;
      uniforms.uMid.value = audioData.mid / 255.0;
      uniforms.uHigh.value = audioData.high / 255.0;
      uniforms.uVolume.value = audioData.volume / 255.0;

      rendererRef.current.render(sceneRef.current, cameraRef.current);
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [audioData]);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full z-0">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
});

export default Visualizer;
