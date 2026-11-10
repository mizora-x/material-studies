// One full-canvas WebGL2 fragment shader draws the page shadow, the moulded bezel,
// the pixel track (nearest sampling, never smoothed) and the jelly-glass knob on top.
import { W, H, OUT8 } from './pixel';

type Vec3 = readonly [number, number, number];

/** Per-study look of the bezel and the knob. Pairs are [night/winter, day/spring]. */
export interface GlassTheme {
  shadow: Vec3;
  shadowAmt: readonly [number, number];
  bezel: readonly [Vec3, Vec3];
  bezelLight: readonly [number, number];
  bezelSpec: readonly [number, number];
  /** sparkly rime on the bezel while it is still night/winter (0 = none) */
  rime: number;
  /** frost on the side of the knob that still faces night/winter (0 = none) */
  frost: number;
  echo: readonly [Vec3, Vec3];
  foot: Vec3;
  fresnel: readonly [Vec3, Vec3];
}

export const PADX = 22;
export const PADY = 27;
export const CWU = W + PADX * 2;
export const CHU = H + PADY * 2;

const VS = `#version 300 es
void main(){vec2 v=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(v*2.-1.,0.,1.);}`;

const FS = `#version 300 es
precision highp float;
uniform sampler2D uTex;uniform vec2 uRes;uniform float uS;uniform vec3 uBg;uniform float uDay;
uniform vec3 uK;uniform vec2 uSt;uniform vec3 uE;uniform vec3 uEA;
uniform vec3 uShCol;uniform vec2 uShAmt;uniform vec3 uBzN;uniform vec3 uBzD;uniform vec2 uBzL;uniform vec2 uBzSp;uniform float uRime;
uniform vec3 uEc0;uniform vec3 uEc1;uniform vec3 uFoot;uniform vec3 uFrN;uniform vec3 uFrD;uniform float uFrost;
out vec4 o;
const vec2 PAD=vec2(${PADX}.,${PADY}.),RS=vec2(${W}.,${H}.);
const float KR=15.,KH=30.;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+1.),f.x),f.y);}
float sdRR(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
float sdBez(vec2 cp){return sdRR(cp,RS*.5+6.,28.);}
vec3 track(vec2 p,float lit){ivec2 t=ivec2(clamp(floor(p-PAD),vec2(0.),RS-1.));t.y+=int(lit)*${H};return texelFetch(uTex,t,0).rgb;}
vec3 scene(vec2 p,float lit){
  vec2 cp=p-PAD-RS*.5;
  float dt=sdRR(cp,RS*.5,22.),db=sdBez(cp);
  float sh=1.-smoothstep(-8.,13.,sdRR(cp-vec2(0.,5.),RS*.5+4.,26.));      // drop shadow, gone before the canvas edge
  vec3 c=mix(uBg,uShCol,sh*sh*mix(uShAmt.x,uShAmt.y,uDay));
  if(db<1.){                                                             // moulded bezel
    float t=clamp(-db/6.,0.,1.),day=max(uDay,lit);
    vec2 n=normalize(vec2(sdBez(cp+vec2(.5,0.))-sdBez(cp-vec2(.5,0.)),sdBez(cp+vec2(0.,.5))-sdBez(cp-vec2(0.,.5)))+1e-5);
    float l=dot(n,normalize(vec2(-.3,-1.)))*cos(t*3.14159);
    vec3 bz=mix(uBzN,uBzD,day)*(1.+l*mix(uBzL.x,uBzL.y,day));
    bz+=smoothstep(.26,0.,abs(t-.3))*max(-n.y,0.)*mix(uBzSp.x,uBzSp.y,day);
    bz+=uRime*(1.-day)*(step(.978,h21(floor(p*uS/2.)))*.16+(vn(p*1.7)-.5)*.07);
    bz*=1.-.3*smoothstep(1.6,0.,dt);
    c=mix(c,clamp(bz,0.,1.),clamp(.5-db*uS,0.,1.));
  }
  if(dt<1.){
    vec3 r=track(p,lit);
    r*=1.-.5*smoothstep(-5.5,0.,sdRR(cp-vec2(0.,2.6),RS*.5,22.))*(1.-.55*lit); // inner shadow along the top of the track
    r*=1.-.22*smoothstep(-1.4,0.,dt);
    c=mix(c,r,clamp(.5-dt*uS,0.,1.));
  }
  return c;
}
float knob(vec2 p,out vec2 q,out vec2 g){
  q=p-uK.xy;q.x+=uK.z*q.y;q/=uSt;
  vec2 a=vec2(q.x,q.y-clamp(q.y,-(KH-KR),KH-KR));float l=length(a);g=a/max(l,1e-4);
  return (l-KR)*min(uSt.x,uSt.y);
}
float sdSeg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;return length(pa-ba*clamp(dot(pa,ba)/dot(ba,ba),0.,1.));}
void main(){
  vec2 p=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y)/uS,cp=p-PAD-RS*.5,q,g;
  vec3 c=scene(p,0.);
  float inB=clamp(.5-sdBez(cp)*uS,0.,1.),inT=clamp(.5-sdRR(cp,RS*.5,22.)*uS,0.,1.);
  for(int i=0;i<3;i++){                                                  // crescent echoes trailing the knob
    float ex=uE[i],side=sign(uK.x-ex);vec2 qe=p-vec2(ex,uK.y);
    vec2 a=vec2(qe.x,qe.y-clamp(qe.y,-8.,8.));float de=length(a)-KR;
    float ring=1.25*smoothstep(3.2,0.,abs(de+2.5))+.4*exp(-abs(de+2.5)/5.);
    c+=mix(uEc0,uEc1,float(i)*.5)*ring*clamp(-qe.x*side/KR,0.,1.)*uEA[i]*inT;
  }
  float dsh=knob(p-vec2(2.5,4.),q,g);                                    // soft shadow of the knob
  c*=1.-.36*(1.-smoothstep(-4.,7.,dsh))*mix(.3,1.,inB);
  vec2 f=(p-uK.xy-vec2(1.,KH*uSt.y-2.))/vec2(10.,3.4);                   // light gathered toward its foot
  c+=uFoot*exp(-dot(f,f))*.32*inB;
  float d=knob(p,q,g);
  if(d<1.){
    float m=clamp(1.+d/(KR*min(uSt.x,uSt.y)),0.,1.);
    vec2 base=uK.xy+(p-uK.xy)/1.28;float bend=pow(m,2.6)*9.;              // magnify ~1.28x, bend toward the rim, split R/G/B there
    vec3 k=vec3(scene(base+g*bend*.78,1.).r,scene(base+g*bend,1.).g,scene(base+g*bend*1.24,1.).b);
    k*=1.-.4*smoothstep(.6,.84,m)*(1.-smoothstep(.9,.99,m));              // darker refraction band
    k=mix(k,mix(uFrN,uFrD,uDay),pow(m,3.)*.3);                            // fresnel tint
    k+=smoothstep(.9,1.,m)*.5;                                            // bright edge
    k=mix(k,vec3(1.),.045);
    if(uFrost>0.){
      float fr=vn(q*.8+3.)*.55+vn(q*2.4)*.45;
      k=mix(k,vec3(.92,.97,1.),smoothstep(.3,1.,m)*smoothstep(-.4,.9,g.x)*smoothstep(.38,.62,fr)*(1.-uDay)*.6*uFrost);
    }
    float hs=min(sdSeg(q,vec2(-KR*.5,-(KH-KR)*.95),vec2(-KR*.52,3.)),sdSeg(q,vec2(-KR*.5,-(KH-KR)*.95),vec2(-KR*.22,-(KH-KR)-KR*.58)));
    k+=smoothstep(2.3,.3,hs)*.5;                                          // long soft streak, upper left
    k+=smoothstep(2.,.8,length(q-vec2(KR*.42,(KH-KR)+KR*.2)))*.9;         // small dot, lower right
    c=mix(c,k,clamp(.5-d*uS,0.,1.));
  }
  o=vec4(clamp(c,0.,1.),1.);
}`;

export interface GlassFrame {
  scale: number;
  bg: readonly [number, number, number];
  day: number;
  knob: readonly [number, number, number];
  stretch: readonly [number, number];
  echo: readonly [number, number, number];
  echoA: readonly [number, number, number];
}

export interface Glass {
  draw(f: GlassFrame): void;
}

export function createGlass(cv: HTMLCanvasElement, theme: GlassTheme): Glass {
  const gl = cv.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) throw new GlassError('This study needs WebGL2, which this browser did not provide.');
  const mk = (type: number, src: string): WebGLShader => {
    const s = gl.createShader(type);
    if (!s) throw new GlassError('The shader failed to compile on this device.');
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(s));
      throw new GlassError('The shader failed to compile on this device.');
    }
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, mk(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(prog));
    throw new GlassError('The shader failed to compile on this device.');
  }
  gl.useProgram(prog);
  const u = (n: string) => gl.getUniformLocation(prog, n);
  const U = {
    tex: u('uTex'), res: u('uRes'), s: u('uS'), bg: u('uBg'), day: u('uDay'),
    k: u('uK'), st: u('uSt'), e: u('uE'), ea: u('uEA'),
  };
  const v3 = (n: string, c: Vec3) => gl.uniform3f(u(n), c[0], c[1], c[2]);
  v3('uShCol', theme.shadow);
  gl.uniform2f(u('uShAmt'), theme.shadowAmt[0], theme.shadowAmt[1]);
  v3('uBzN', theme.bezel[0]);
  v3('uBzD', theme.bezel[1]);
  gl.uniform2f(u('uBzL'), theme.bezelLight[0], theme.bezelLight[1]);
  gl.uniform2f(u('uBzSp'), theme.bezelSpec[0], theme.bezelSpec[1]);
  gl.uniform1f(u('uRime'), theme.rime);
  v3('uEc0', theme.echo[0]);
  v3('uEc1', theme.echo[1]);
  v3('uFoot', theme.foot);
  v3('uFrN', theme.fresnel[0]);
  v3('uFrD', theme.fresnel[1]);
  gl.uniform1f(u('uFrost'), theme.frost);

  gl.bindVertexArray(gl.createVertexArray());
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, W, H * 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, OUT8);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(U.tex, 0);

  return {
    draw(f) {
      gl.viewport(0, 0, cv.width, cv.height);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, W, H * 2, gl.RGBA, gl.UNSIGNED_BYTE, OUT8);
      gl.uniform2f(U.res, cv.width, cv.height);
      gl.uniform1f(U.s, f.scale);
      gl.uniform3f(U.bg, f.bg[0] / 255, f.bg[1] / 255, f.bg[2] / 255);
      gl.uniform1f(U.day, f.day);
      gl.uniform3f(U.k, f.knob[0], f.knob[1], f.knob[2]);
      gl.uniform2f(U.st, f.stretch[0], f.stretch[1]);
      gl.uniform3f(U.e, f.echo[0], f.echo[1], f.echo[2]);
      gl.uniform3f(U.ea, f.echoA[0], f.echoA[1], f.echoA[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}

export class GlassError extends Error {}
