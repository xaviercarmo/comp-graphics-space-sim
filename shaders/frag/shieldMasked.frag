varying highp float vNoise;

uniform sampler2D tExplosion;
uniform float time;
uniform float alphaMult;

highp float rand3d(vec3 co) {
    highp float a = 12.9898;
    highp float b = 78.233;
    highp float c = 144.7272;
    highp float dt = dot(co.xyz, vec3(a, b, c));
    highp float sn = mod(dt, 3.14);

    highp float d = 43758.5453;
    return fract(sin(sn) * d);
}

float random(vec3 scale, float seed){
    return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);
}

void main() {
    float rand = .01 * random(vec3(12.9898, 78.233, 151.7182), time);
    vec2 tPos = vec2(0, 1. - 1.3 * vNoise + rand);
    vec4 color = texture2D(tExplosion, tPos);
    color.b = 1.;
    color.a = (color.r + color.g + color.b) / 3.0 * alphaMult - .1;
    // get the inverse luminosity - i.e. as color gets brighter, mask it out to occlude bloom behind
    float luminosity = 1. - (0.299 * color.r + 0.587 * color.g + 0.114 * color.b);

    color = vec4(0., 0., 0., color.a);

    gl_FragColor = color;
}