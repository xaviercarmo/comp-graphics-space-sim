varying vec2 vUv;
varying highp float vNoise;
varying vec3 vPos;
varying float vTime;

uniform sampler2D tSun;

highp float rand3d(vec3 co) {
    highp float a = 12.9898;
    highp float b = 78.233;
    highp float c = 144.7272;
    highp float dt = dot(co.xyz, vec3(a, b, c));
    highp float sn = mod(dt, 3.14);

    highp float d = 43758.5453;
    return fract(sin(sn) * d);
}

float random( vec3 scale, float seed ){
    return fract( sin( dot( gl_FragCoord.xyz + seed, scale ) ) * 43758.5453 + seed ) ;
}

void main() {
    //vec3 color = vec3(vUv * (1.0 - noise), 0.0);
    //float posLength = length(vPos);
    //float minVal = 12.;
    //float normalisedLength = (length(vPos) - minVal) / (20. - minVal);
    //vec3 color = vec3(normalisedLength * .75, normalisedLength, normalisedLength * 0.05);

    //float rand = .01 * rand3d(gl_FragCoord.xyz); //try uv here too just to see
    float rand = .01 * random( vec3( 12.9898, 78.233, 151.7182 ), vTime );
    vec2 tPos = vec2(0, 1. - 1.7 * -vNoise + rand); //try just straight up mapping it to depth from min to max offset
    //vec3 color = vec3(vUv * (1. - 2. * vNoise), 0.);
    vec4 color = texture2D(tSun, tPos);
    
    //color.a = (color.r + color.g + color.b) / 3.;
    color.a = 1.1;

    //alpha = 1.1;
    gl_FragColor = vec4(color.rgb, color.a - .1);

    //FOR LATER:
    //Can use icosahedron with detail = 1 for a shield. Can customise shader to make the white spots show up
    //where the space ship was hit
}
