uniform float pointSize;
            
attribute float alpha;
attribute vec3 color;

varying float vAlpha;
varying vec3 vPosition;
varying vec3 vColor;

void main() {
    vAlpha = alpha;
    vPosition = position;
    vColor = color;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

    gl_PointSize = pointSize * (300.0 / length(mvPosition.xyz));
    gl_Position = projectionMatrix * mvPosition;
}