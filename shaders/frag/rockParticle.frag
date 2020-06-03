uniform sampler2D texture;
uniform float pointSize;

varying vec3 vPosition;
varying float vPointSize;

void main() {
    float alpha = pointSize * 100.0 / (vPointSize * vPointSize);
    gl_FragColor = vec4(texture2D(texture, gl_PointCoord).xyz, alpha);
}