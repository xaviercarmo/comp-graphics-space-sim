uniform sampler2D texture;

varying float vAlpha;
varying vec3 vPosition;
varying vec3 vColor;

void main() {
    vec4 colorBias = vec4(vColor, vAlpha);
    
    gl_FragColor = colorBias * texture2D(texture, gl_PointCoord);
}