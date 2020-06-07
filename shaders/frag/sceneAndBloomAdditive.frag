// adapted from: https://github.com/mrdoob/three.js/blob/master/examples/webgl_postprocessing_unreal_bloom_selective.html

uniform sampler2D baseTexture;
uniform sampler2D bloomTexture;
uniform sampler2D variableBloomTexture;

varying vec2 vUv;

vec4 getTexture(sampler2D texelToLinearTexture) {
    return mapTexelToLinear(texture2D(texelToLinearTexture, vUv));
}

void main() {
    gl_FragColor = getTexture(baseTexture) + getTexture(bloomTexture) + getTexture(variableBloomTexture);
    // gl_FragColor = getTexture(baseTexture);
}