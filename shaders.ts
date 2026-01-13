// Vertex Shader - Simple full screen quad
export const vertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Fragment Shader - Adapted from user's "BRZI ARZI" ShaderToy code
export const fragmentShader = `
uniform float uTime;
uniform vec2 uResolution;
uniform float uBass;
uniform float uMid;
uniform float uHigh;
uniform float uVolume;

varying vec2 vUv;

// BRZI ARZI - NEON FRACTAL VORTEX LOGIC
// Adapted for Three.js/WebGL environment

// Palette generation
vec3 palette( float t ) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.263,0.416,0.557);

    return a + b*cos( 6.28318*(c*t+d) );
}

void main() {
    // Convert vUv (0..1) to centered uv (-1..1) corrected for aspect ratio
    vec2 uv = (vUv * 2.0 - 1.0);
    uv.x *= uResolution.x / uResolution.y;
    
    vec2 uv0 = uv; // Store initial UV for reference
    vec3 finalColor = vec3(0.0);
    
    // Audio reactivity factors
    float bassShake = uBass * 0.2;
    float glitchFactor = uHigh * 0.1;
    
    // Animate zoom and rotation (Chaos Engine)
    // Speed up with volume
    float time = uTime * (0.2 + uVolume * 0.05); 
    
    // Rotation matrix with audio jitter
    float rot = sin(time * 0.5) + (uBass * 0.5);
    mat2 m = mat2(cos(rot), -sin(rot), sin(rot), cos(rot));
    uv = m * uv;

    // Fractal Loop (4 iterations per user request)
    for(float i = 0.0; i < 4.0; i++) {
        // Fractal space distortion
        uv = abs(uv) - 0.5;
        uv = abs(uv) - 0.3;
        
        // Scale factor reactive to Bass
        float scale = 1.2 + (uBass * 0.1); 
        uv *= scale; 
        
        // Neon Colors (Balkan Cyberpunk Palette: Pink/Green/Blue)
        // Original logic: float d = length(uv) * exp(-length(uv0));
        float d = length(uv) * exp(-length(uv0));
        
        // Dynamic color palette influenced by Mids
        vec3 col = palette(length(uv0) + i*.4 + time*.4);
        
        // Color shift based on time and iteration + High frequencies
        col += 0.5 * vec3(sin(time + i + uHigh), cos(time + i*0.5), sin(time - i));
        
        // Glow calculation
        d = sin(d * 8.0 + time) / 8.0;
        d = abs(d);
        
        // Neon glow intensity - heavily boosted by volume
        float intensity = 0.02 + (uMid * 0.01);
        d = intensity / d; 
        
        // Add brightness on drops
        d = pow(d, 1.2); 

        finalColor += col * d;
    }

    // Glitch effect (Scanlines)
    // High frequency audio disrupts scanlines
    float scanSpeed = 10.0 + (uHigh * 50.0);
    float scanline = sin(gl_FragCoord.y * 0.5 + uTime * scanSpeed);
    
    // Aggressive glitching
    if(scanline > 0.95) {
        finalColor -= 0.5;
        // RGB Split on heavy bass
        if (uBass > 0.6) {
            finalColor.r += 0.2;
            finalColor.b -= 0.2;
        }
    }
    
    // Noise/Grain
    float noise = fract(sin(dot(uv0.xy + uTime, vec2(12.9898, 78.233))) * 43758.5453);
    finalColor += noise * 0.05;

    gl_FragColor = vec4(finalColor, 1.0);
}
`;
