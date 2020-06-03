uniform float pointSize;
            
varying vec3 vPosition;
varying float vPointSize;

void main() {
    vPosition = position;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vPointSize = pointSize * (300.0 / length(mvPosition.xyz));

    gl_PointSize = vPointSize;
    gl_Position = projectionMatrix * mvPosition;
}