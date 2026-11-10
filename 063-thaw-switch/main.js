// Thaw Switch — Material Studies No. 063
// Raw WebGL2 + Web Audio + a 176×50 CPU pixel buffer. No libraries.
(()=>{'use strict';
const clamp=(x,a,b)=>x<a?a:x>b?b:x,lerp=(a,b,t)=>a+(b-a)*t,sst=(a,b,x)=>{x=clamp((x-a)/(b-a),0,1);return x*x*(3-2*x)};

// ═════════════════════════ PIXEL HOLLOW (176×50, redrawn on the CPU every frame)
const W=176,H=50,KX0=16,KX1=160;
const A=new Uint32Array(W*H),EM=new Uint8Array(W*H),L=new Int32Array(W*H);
const FW=new Uint8ClampedArray(W*H*3),FS=new Uint8ClampedArray(W*H*3);      // finished winter / spring worlds
const OUTC=new Uint8ClampedArray(W*H*2*4),OUT8=new Uint8Array(OUTC.buffer); // top: display, bottom: spring (seen through the glass)
const BAY=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v=>(v+.5)/16);
const pk=h=>0xff000000|((h&255)<<16)|(h&0xff00)|(h>>>16&255);
const mixc=(a,b,t)=>{const r=a>>16&255,g=a>>8&255,c=a&255;return((r+((b>>16&255)-r)*t)<<16)|((g+((b>>8&255)-g)*t)<<8)|(c+((b&255)-c)*t)};
function put(x,y,c,e){x=Math.floor(x);y=Math.floor(y);if(x<0||y<0||x>=W||y>=H)return;const i=y*W+x;A[i]=pk(c);EM[i]=e|0}
function fill(x,y,w,h,c,e){for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)put(i,j,c,e)}
// scratch layer → stamp: automatic 1-px outline, lighter top pixels, darker bottom pixels
let bx0=W,by0=H,bx1=-1,by1=-1;
function P(x,y,c){x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=W||y>=H)return;L[y*W+x]=c|0x1000000;if(x<bx0)bx0=x;if(x>bx1)bx1=x;if(y<by0)by0=y;if(y>by1)by1=y}
function R(x,y,w,h,c){x=Math.round(x);y=Math.round(y);for(let j=0;j<h;j++)for(let i=0;i<w;i++)P(x+i,y+j,c)}
function E(cx,cy,rx,ry,c){if(rx<.5||ry<.5)return;for(let y=Math.ceil(cy-ry);y<=cy+ry;y++)for(let x=Math.ceil(cx-rx);x<=cx+rx;x++){const dx=(x-cx)/(rx+.3),dy=(y-cy)/(ry+.3);if(dx*dx+dy*dy<=1)P(x,y,c)}}
function LN(x0,y0,x1,y1,c){const n=Math.max(1,Math.round(Math.max(Math.abs(x1-x0),Math.abs(y1-y0))));for(let k=0;k<=n;k++)P(x0+(x1-x0)*k/n,y0+(y1-y0)*k/n,c)}
function speck(c,mod,seed){for(let y=by0;y<=by1;y++)for(let x=bx0;x<=bx1;x++)if(L[y*W+x]&&((x*7+y*13+seed)%mod)===0)L[y*W+x]=c|0x1000000}
const OL=0x2b2138,DK=0x2b2138;
function ST(o){o=o||{};if(bx1<0)return;const ol=o.ol===undefined?OL:o.ol,e=o.em|0;
  const x0=Math.max(0,bx0-1),x1=Math.min(W-1,bx1+1),y0=Math.max(0,by0-1),y1=Math.min(H-1,by1+1);
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=y*W+x,v=L[i];
    if(v){let c=v&0xffffff;
      if(o.flat!==undefined){if(o.dith&&((x+y)&1))continue;c=o.flat}
      else if(o.sh!==false){if(y===0||!L[i-W])c=mixc(c,0xffffff,.34);else if(y===H-1||!L[i+W])c=mixc(c,0x1a1030,.3)}
      A[i]=pk(c);EM[i]=e}
    else if(ol!==null&&((x>0&&L[i-1])||(x<W-1&&L[i+1])||(y>0&&L[i-W])||(y<H-1&&L[i+W]))){A[i]=pk(ol);EM[i]=0}}
  for(let y=by0;y<=by1;y++)L.fill(0,y*W+bx0,y*W+bx1+1);
  bx0=W;by0=H;bx1=-1;by1=-1}

// scene state (written by the main loop)
let p=0,T=0,beat=0,pulse=0,bxn=-14,fx=30,stoveOn=false,stoveA=0,party=0,inA=0,waiting=false,shake=0,boom=false;
let bearX=110,bearDir=1,walkPh=0,bearSt=0,bearTgt=110,bearHead=[110,33],flock=[150,7];
const lit=new Array(12).fill(false),glow=new Array(12).fill(false),dripT=new Array(12).fill(-9),hits=[];
const prog=(x,span)=>clamp((fx-x)/span,0,1);                     // thaw progress of something at x (starts under the glass)
const wireY=x=>{const f=((x+2)%29.7)/29.7;return Math.round(12*f*(1-f))};
const BX=[],BY=[];for(let i=0;i<12;i++){BX[i]=Math.round(10+i*13.9);BY[i]=wireY(BX[i])+1}
const BC=[0xff6b6b,0xffd23f,0x6fe7b7,0x6fa8ff,0xff8fc8],BCR=BC.map(c=>[c>>16&255,c>>8&255,c&255]);
const BR=0x9a623a,MZ=0xe9c9a0,SNOW=0xf5f9ff;
const mh1=x=>Math.round(15+6*Math.sin(x*.07+1)+3*Math.sin(x*.19));   // far range
const mh2=x=>Math.round(28+3*Math.sin(x*.05+2)+1.5*Math.sin(x*.13)); // near hills
const GY=35;
const FLOWERS=[[12,47,0xb48cff],[24,46,0xffd23f],[36,47,0xff6b6b],[45,45,0xff6b6b],[51,48,0xffd23f],[59,47,0xb48cff],[103,48,0xff8fc8],[122,45,0xffd23f],[126,48,0xff6b6b],[136,47,0xb48cff],[149,45,0xffffff],[155,48,0xff8fc8],[160,44,0xffd23f]];
const TIPS=[[136,19],[149,17],[142,13],[153,23],[131,24],[139,15],[146,21]];
const inPond=(x,y)=>{const dx=(x-81)/18.4,dy=(y-43)/3.4;return dx*dx+dy*dy<=1};

function sky(sp){
  let top,bot;
  if(sp){const c=sst(.3,.72,p);top=mixc(0xb7a3cc,0x4fa9ee,c);bot=mixc(0xffdcc6,0xcdeefc,c)}
  else{const c=sst(.3,.95,p)*.7;top=mixc(0x101c38,0x55678a,c);bot=mixc(0x3d5884,0xa9bad2,c)}
  for(let y=0;y<GY;y++)for(let x=0;x<W;x++){const f=clamp(y/33+(BAY[(y&3)*4+(x&3)]-.5)*.14,0,1);put(x,y,mixc(top,bot,Math.round(f*6)/6),1)}
  if(!sp){ // stars + aurora
    const a=1-sst(.1,.55,p);
    for(let k=0;k<16;k++){const sx=(k*47+13)%176,sy=1+(k*5)%9,tw=Math.sin(T*(1.2+k*.31)+k*2);if(a>.25+(k%4)*.15&&tw>-.5)put(sx,sy,tw>.6?0xffffff:0xaab8ee,1)}
    if(a>.02)for(let x=0;x<W;x++){const y0=7+3*Math.sin(x*.06+T*.3)+2*Math.sin(x*.15-T*.22);
      for(let d=0;d<7;d++){const y=Math.round(y0)+d;if(y>=0&&BAY[(y&3)*4+(x&3)]<(1-d/7)*a*(.55+.35*Math.sin(x*.11+T*.7)))put(x,y,mixc(0x7dffc8,0x4f9dff,d/6),1)}}
  }else{ // sun, clouds, rainbow
    const rise=sst(.12,.8,p),sx=84+rise*8,sy=31-rise*22,sc=mixc(0xffb98a,0xfff1a0,sst(.3,.7,p));
    for(let dy=-5;dy<=5;dy++)for(let dx=-5;dx<=5;dx++){const d=dx*dx+dy*dy,x=Math.round(sx+dx),y=Math.round(sy+dy);
      if(d<=11)put(x,y,d<=4?mixc(sc,0xffffff,.4):sc,1);else if(d<=24&&((dx+dy)&1)&&Math.sin(T*2+dx*1.3)>-.2)put(x,y,mixc(sc,0xffffff,.5),1)}
    if(party>.02)for(let k=0;k<5;k++){const r=31-k,c=[0xff6b6b,0xffb04a,0xffe66b,0x6fe7b7,0x6fa8ff][k];
      for(let an=0;an<=3.1416;an+=.012){const x=Math.round(88-Math.cos(an)*r*1.9),y=Math.round(36-Math.sin(an)*r);if(y>=0&&y<GY&&BAY[(y&3)*4+(x&3)]<party*.85)put(x,y,c,1)}}
    const ca=sst(.25,.5,p);if(ca>0)for(let k=0;k<4;k++){const cx=((T*1.4+k*51)%200)-12,cy=3+(k*3)%9,half=ca<.7;
      for(let dx=-5;dx<=5;dx++){if(half&&(dx&1))continue;if(Math.abs(dx)<=3)put(cx+dx,cy,0xffffff,1);put(cx+dx,cy+1,Math.abs(dx)>3?0xffffff:0xe4f0fb,1);if(Math.abs(dx)<=1)put(cx+dx+1,cy-1,0xffffff,1)}}
  }
}
function land(sp){
  for(let x=0;x<W;x++){const t1=mh1(x),t2=mh2(x),shade=mh1(x+2)>mh1(x-2);
    for(let y=t1;y<t2;y++){let c;const d=y-t1;
      if(sp){c=shade?0x7388b8:0x90a8d0;if(d<(14-t1)*.7)c=shade?0xdfe8f8:0xffffff;else if(y>23)c=mixc(c,0x7fbf8e,.55)}
      else{c=shade?0x93a6d2:0xc3d2ee;if(d>7)c=mixc(c,0x7f93c4,.35)}
      put(x,y,c,0)}
    for(let y=t2;y<GY;y++)put(x,y,sp?(y===t2?0x8fdc78:0x6dbb6a):(y===t2?0xffffff:0xe3ebfa),0)}
  for(let x=3;x<W;x+=7){const tx=x+((x*5)%3),ty=mh2(tx)+1+((x*3)%3),c=sp?0x3f8f5a:0x2f5d50; // little pines on the hills
    put(tx,ty-3,sp?c:0xffffff);fill(tx-1,ty-2,3,1,c);fill(tx-1,ty-1,3,1,mixc(c,0x102030,.25));if(!sp)put(tx-1,ty-2,0xe8f0ff)}
  for(let y=GY;y<H;y++)for(let x=0;x<W;x++){let c;
    if(sp){c=0x7fd06c;if((x*5+y*3)%13===0)c=0x5fb85c;else if((x*7+y*11)%29===0)c=0xb2ec92;if(y===GY)c=0x9be283}
    else{c=0xf3f7ff;if((x*3+y*5)%11===0)c=0xd9e4f6;else if(y===GY)c=0xffffff;else if(y>46&&((x+y)&1))c=0xe2eaf9}
    put(x,y,c,0)}
  for(let y=37;y<44;y++){const x0=20+(y-37)*3;for(let x=x0;x<x0+6;x++)if((x+y*3)%5)put(x,y,sp?0xcfa878:0xdde6f6)} // path from the door
}
function pine(sp){
  const g=sp?0x3a9a62:0x2f6f5a;R(5,34,2,4,0x6b4a3a);
  for(let t=2;t>=0;t--){const ty=12+t*6;for(let r=0;r<8;r++){const hw=Math.round(.6+r*.62+t*.6);R(6-hw,ty+r,hw*2+1,1,(!sp&&r<2+(t===0?1:0))?SNOW:g)}}
  if(!sp){P(3,22,SNOW);P(9,27,SNOW);P(2,28,SNOW)}
  ST();
}
function cabin(sp){
  // smoke from the stove
  const sm=1-sst(.5,.8,p);
  if(sm>.05)for(let k=0;k<4;k++){const ph=(T*.22+k/4)%1;if(ph*.9>sm)continue;const r=1+ph*1.8;E(32.5+ph*7+Math.sin(ph*5+k)*1.5,11-ph*12,r,r*.8,sp?0xffffff:0xc5cfe2)}
  ST({ol:null,sh:false});
  R(31,12,3,7,0x9a4a3a);if(!sp)R(30,11,5,1,SNOW);ST();
  R(16,25,22,12,0xb06f3f);ST();
  for(const y of[28,31,34])fill(16,y,22,1,0x8f562f);
  for(let j=0;j<7;j++){const xo=Math.round(j*.75);R(17-xo,18+j,21+2*xo,1,sp?((j&1)?0xb04832:0xc8553d):(j===6?0xcfdcf2:SNOW))}ST();
  if(sp){for(let x=14;x<41;x+=3)put(x+((x>>1)&1),21+((x*3)%3),0x9a3d2c);put(20,19,0x6dbb6a);put(21,19,0x6dbb6a);put(35,22,0x6dbb6a)}
  else for(const q of[[13,3],[15,2],[26,2],[40,3],[42,2]])for(let j=0;j<q[1];j++)put(q[0],25+j,j===q[1]-1?0xaedcff:0xe6f6ff);
  R(19,29,5,8,0x6b4226);ST();put(22,33,0xf7c948);
  R(27,28,7,6,0xf7ead0);ST();
  const lit=!sp&&stoveOn;fill(28,29,5,4,sp?0x9fd8f5:lit?0xffd27a:0x2a3a5a,lit?1:0);fill(30,29,1,4,0xf7ead0);fill(28,31,5,1,0xf7ead0);
  if(sp){fill(27,34,7,1,0x8a552b);put(28,33,0xff8fc8);put(30,33,0xffd23f);put(32,33,0xff8fc8)}
  fill(25,28,1,6,0xffffff);const th=Math.round(1+p*5);fill(25,34-th,1,th,0xe24a4a);put(25,34,0xe24a4a); // thermometer
  if(!sp)for(let x=15;x<39;x++)if((x*3)%4)put(x,36,SNOW);
}
function gramophone(sp){
  R(43,37,6,3,0x8a5a3a);R(43,37,6,1,0xc99a66);if(!sp)R(43,36,6,1,SNOW);ST();
  R(44,34,4,3,0x2f8f8a);ST();put(46,35,0xf7c948);
  const th=boom?pulse*1.1:0;LN(46,33,47,30,0xd9a441);E(49,28,2.3+th,2.7+th,0xf2c14e);ST();put(49,28,0x8a5a2a);put(50,28,0x8a5a2a);put(49,29,0x8a5a2a);
}
function snowman(sp){
  const m=sp?prog(56,30):0,s=1-m,by=41;
  if(m>.45){E(56,42,3+m*2,1.2,0x7fc4f0);ST()}
  const r1=3.6*s,r2=2.6*s,r3=2*s,w=.4+.6*s;
  E(56,by-r1,3.6*w,r1,SNOW);E(56,by-2*r1-r2+1,2.6*w,r2,SNOW);const hy=by-2*r1-2*r2-r3+2;E(56,hy,2*w,r3,SNOW);
  if(s>.3){LN(53,by-2*r1-r2+1,50,by-2*r1-r2-1,0x6b4a3a);LN(59,by-2*r1-r2+1,62,by-2*r1-r2-2,0x6b4a3a)}
  const ty=Math.round(Math.min(41,hy-r3));R(54,ty,5,1,0x33263a);R(55,ty-2,3,2,0x33263a);ST();
  put(55,ty-1,0xe24a4a);put(56,ty-1,0xe24a4a);put(57,ty-1,0xe24a4a);
  if(s>.4){put(55,hy,DK);put(57,hy,DK);put(58,Math.round(hy)+1,0xff8a3a);fill(54,Math.round(hy+r3),5,1,0xe24a4a);put(56,Math.round(by-2*r1-r2+1),DK)}
  else put(60,42,0xff8a3a);
}
function pond(sp){
  E(81,43,19,4,sp?0x4fa8e8:0xcfeafa);ST();
  if(sp){
    for(let k=0;k<9;k++){const x=63+((k*13+T*3.2)%36),y=40+(k*2)%7;for(let d=0;d<3;d++)if(inPond(x+d,y))put(x+d,y,0x9fd8fa)}
    for(const fxp of[66,74,82,90,97]){const d=fx-fxp;if(d>2&&d<34){const b=Math.round(Math.sin(T*2+fxp)*.6),yy=41+(fxp%5)+b;if(inPond(fxp,yy)&&inPond(fxp+2,yy)){fill(fxp,yy,3,1,0xffffff);put(fxp+1,yy+1,0xbfe3f7)}}} // ice floes
    const lp=prog(70,40);if(lp>.5){E(70,44,2.6,1,0x4fae5a);E(92,45,2,.8,0x4fae5a);ST({sh:false});put(93,44,0xff8fc8)}
    if(lp>.8){const hop=party>.5&&pulse>.5?-2:0;E(70,42+hop,1.7,1.4,0x7fd65a);ST();put(69,41+hop,DK);put(71,41+hop,DK)} // frog
    if(party>.3)for(let k=0;k<6;k++){const x=64+(k*29+Math.floor(T*5)*7)%34,y=40+(k*3)%6;if(inPond(x,y))put(x,y,0xffffff,1)}
  }else{
    for(let k=0;k<7;k++){const x=65+k*5,y=40+(k*3)%6;for(let d=0;d<3;d++)if(inPond(x+d,y))put(x+d,y,0xffffff)}
    for(let x=63;x<Math.min(100,fx+12);x++){const y=43+((x*7)%3)-1+(x>80?1:0);if(inPond(x,y)&&(x%5))put(x,y,0x5f8fc0);if(x%9===4&&inPond(x,y-2))put(x,y-1,0x5f8fc0);if(x%11===6&&inPond(x,y+2))put(x,y+1,0x5f8fc0)} // cracks ahead of the thaw
  }
}
function den(sp){
  E(110,37,11,7,sp?0x69bd62:0xeef3ff);if(!sp)speck(0xd5e0f5,9,3);else{speck(0x58a856,11,2);speck(0xffe66b,31,7);speck(0xff8fc8,37,5)}ST();
  E(110,37.5,4.2,3.2,0x2a1f2e);ST({ol:null,sh:false});
}
function tree(sp){
  R(141,27,3,11,0x6b4a3a);P(140,37,0x6b4a3a);P(144,37,0x6b4a3a);
  LN(142,27,136,19,0x6b4a3a);LN(142,26,149,17,0x6b4a3a);LN(142,24,142,13,0x6b4a3a);LN(143,29,153,23,0x6b4a3a);LN(141,29,131,24,0x6b4a3a);LN(140,22,139,15,0x6b4a3a);LN(146,22,146,21,0x6b4a3a);ST();
  if(!sp){for(const t of TIPS){put(t[0],t[1]-1,SNOW);put(t[0]+(t[0]<142?1:-1),t[1]-1,SNOW)}put(141,26,SNOW);put(143,26,SNOW);return}
  const b=prog(128,36);
  if(b<.12)return;
  if(b<.4){for(const t of TIPS)put(t[0],t[1],0xff9cc8);return}
  const q=sst(.4,1,b);
  TIPS.forEach((t,k)=>E(t[0],t[1]-1,q*(5.6+(k%3)*.7),q*(3.9+(k%2)*.6),k&1?0xffb7d5:0xff9cc8));E(142,17,q*8.5,q*5,0xffc4dd);
  speck(0xffe3ef,5,1);speck(0xf07fb0,7,4);speck(0x8fd67a,23,9);ST();
}
function stoneLantern(sp){
  R(165,39,5,2,0x9aa0aa);R(166,34,3,5,0x9aa0aa);R(165,30,5,4,0xaab0ba);R(164,28,7,2,0x8a909a);R(166,27,3,1,sp?0x8a909a:SNOW);if(!sp)R(164,27,7,1,SNOW);ST();
  const on=!sp||party>.4;fill(166,31,3,2,on?0xffd27a:0x4a4658,on?1:0);
}
function flowers(){
  for(const f of FLOWERS){const g=clamp((fx-f[0]-8)/14,0,1);if(g<=0)continue;const h=Math.max(1,Math.round(g*3));
    for(let j=0;j<h;j++)put(f[0],f[1]-j,0x3d9950);put(f[0],f[1]-h,g>.6?f[2]:0x8fd67a);if(g>=1){put(f[0]-1,f[1]-h,mixc(f[2],0xffffff,.45));put(f[0]+1,f[1]-h,mixc(f[2],0xffffff,.45));put(f[0]+1,f[1]-1,0x5cc068)}}
}
function bearWalk(cx,dir){
  const ph=Math.floor(walkPh)&1,hx=cx+6*dir;
  E(cx,41,5.5,3,BR);E(hx,39,3,2.8,BR);P(hx-2,36,BR);P(hx+2,36,BR);P(cx-6*dir,40,BR);
  [-4,-2,2,4].forEach((o,i)=>R(cx+o,44,1,3-((i&1)^ph),BR));ST();
  put(hx,38,DK);put(hx+2*dir,39,DK);put(hx+2*dir,40,MZ);put(hx+dir,40,MZ);bearHead=[hx,35];
}
function bearDance(cx,ghost){
  const bob=pulse>.5?-1:0,arm=Math.floor(beat)&1;
  E(cx,39+bob,3.4,4.8,BR);E(cx,31.5+bob,3.3,2.8,BR);P(cx-3,29+bob,BR);P(cx+3,29+bob,BR);
  LN(cx-3,36+bob,cx-6,(arm?32:38)+bob,BR);LN(cx+3,36+bob,cx+6,(arm?38:32)+bob,BR);
  R(cx-2,44,1,3-(arm?1:0),BR);R(cx+1,44,1,3-(arm?0:1),BR);
  if(ghost){ST({flat:ghost,dith:true,em:1,ol:null});return}
  R(cx-1,37+bob,3,4,MZ);ST();
  put(cx-1,31+bob,DK);put(cx+1,31+bob,DK);put(cx,32+bob,DK);put(cx-1,33+bob,MZ);put(cx,33+bob,MZ);put(cx+1,33+bob,MZ);
  [0xff8fc8,0xffe66b,0xffffff,0xffe66b,0xff8fc8].forEach((c,i)=>put(cx-2+i,29+bob,c));bearHead=[cx,27+bob]; // flower crown
}
function bear(){
  const moving=Math.abs(bearX-bearTgt)>.7,cx=Math.round(bearX);
  if(moving||bearSt===3){bearWalk(cx,bearDir);return}
  if(bearSt===4){const sw=Math.sin(beat*Math.PI/2),dn=Math.cos(beat*Math.PI/2)>0?1:-1,x=128+Math.round(2.6*sw);
    bearDance(x-dn*4,0xff5fb8);bearDance(x-dn*2,0xff9fd4);bearDance(x,0);return}
  if(bearSt===0){ // curled up in the den, breathing
    const br=Math.sin(T*1.5)*.5;E(110,38.4-br*.3,3.2,1.9+br,BR);P(108,36,BR);ST({ol:null});put(109,38,0x7a4a2a);put(111,38,0x7a4a2a);
    for(let k=0;k<3;k++){const ph=(T*.4+k/3)%1,zx=Math.round(113+ph*6+Math.sin(ph*6+k)*1.2),zy=Math.round(33-ph*13),c=mixc(0xffffff,0x9aa8e0,ph);
      if(ph>.05){put(zx,zy,c,1);put(zx+1,zy,c,1);if(ph>.3){put(zx+2,zy,c,1);put(zx+1,zy+1,c,1);put(zx,zy+2,c,1);put(zx+1,zy+2,c,1);put(zx+2,zy+2,c,1)}else{put(zx,zy+1,c,1);put(zx+1,zy+1,c,1)}}}
    bearHead=[110,32];return}
  if(bearSt===1){ // peeking out, blinking, yawning now and then
    E(110,36.5,3.3,2.8,BR);P(108,33,BR);P(112,33,BR);R(107,39,2,1,BR);R(112,39,2,1,BR);ST();
    const bl=(T%3.1)<.14,yawn=(T%5.2)<.7;put(109,36,bl?0x7a4a2a:DK);put(111,36,bl?0x7a4a2a:DK);put(109,38,MZ);put(110,38,yawn?0x8a2a3a:MZ);put(111,38,MZ);put(110,37,DK);
    bearHead=[110,32];return}
  E(110,42,3.7,3.8,BR);E(110,36,3.3,2.8,BR);P(108,33,BR);P(112,33,BR);R(107,45,2,1,BR);R(112,45,2,1,BR); // sitting, scratching
  const sc=(T%2.4)<.8&&(Math.floor(T*10)&1);LN(113,41,115,sc?38:40,BR);R(109,41,3,3,MZ);ST();
  const bl=(T%3.4)<.14;put(109,36,bl?0x7a4a2a:DK);put(111,36,bl?0x7a4a2a:DK);put(110,37,DK);put(109,38,MZ);put(110,38,MZ);put(111,38,MZ);bearHead=[110,32];
}
function geese(){
  // the flock, circling while it waits; it jumps 2 px with every honk
  if(inA<.6&&(waiting||inA>.02)){const fxk=flock[0]-inA*70,fyk=flock[1]+inA*44-shake,fl=Math.floor(T*5)&1;
    [[0,0],[3,-2],[3,2],[6,-4],[6,4]].forEach((o,i)=>{const x=Math.round(fxk+o[0]),y=Math.round(fyk+o[1]),f=(fl^(i&1))?1:0;put(x-1,y-f,DK);put(x,y,DK);put(x+1,y-f,DK)})}
  if(inA>.3){[92,85,80,75].forEach((tx,k)=>{const x=Math.round(lerp(104+k*4,tx,sst(.3+k*.06,1,inA)));if(x>98)return;const bob=(pulse>.5)===!(k&1)?-1:0;
    if(k===0){E(x,41+bob,3,1.8,0xfdfaf3);R(x-3,37+bob,1,4,0xfdfaf3);P(x-4,37+bob,0xfdfaf3);ST();put(x-5,37+bob,0xff9a3a);put(x-3,37+bob,DK);put(x+1,41+bob,0xd9dfe8)}
    else{E(x,42+bob,1.5,1.1,0xffd94a);P(x-2,41+bob,0xffd94a);ST();put(x-3,41+bob,0xff9a3a)}
    put(x+4,43,0xbfe3f7);put(x+5,44,0xbfe3f7)})}
}
function rope(){
  for(let i=0;i<W;i++)put(i,wireY(i),0x3a3048);
  for(let i=0;i<12;i++){const on=glow[i],c=BC[i%5],x=BX[i],y=BY[i];
    R(x-1,y,3,3,on?c:mixc(c,0x566078,.66));if(!lit[i])R(x-1,y,3,1,SNOW);ST({em:on?1:0});if(on)put(x,y+1,0xffffff,1);
    if(!lit[i]){const n=3+(i*7)%3;for(let j=0;j<n;j++)put(x,y+4+j,j===n-1?0x9fd0f5:(Math.sin(T*3+i)>.8&&j===1?0xffffff:0xe1f3ff))}       // icicle
    else{const a=T-dripT[i];if(a>=0&&a<.55){const dy=y+4+a*a*150;if(dy<H){put(x,dy,0xbfe9ff,1);put(x,dy-1,0x8fd0f5,1)}}}}                // its last drop
}
function particles(sp){
  if(!sp){for(let k=0;k<50;k++){const x=((k*37.7-T*(2+k%3)+Math.sin(T*.8+k)*2)%176+176)%176,y=((k*17.3+T*(7+(k%5)*2.2))%54)-2;put(x,y,k%3?0xffffff:0xdbe6ff,k%4===0?1:0)}return}
  const b=prog(128,36);
  if(b>.8)for(let k=0;k<7;k++){const ph=(T*.16+k/7)%1;put(128+(k*5)%28+Math.sin(ph*7+k)*3-ph*8,22+ph*26,k&1?0xffc4dd:0xff9cc8,1)}
  if(party>.3)for(let k=0;k<26;k++){const x=((k*37+11+Math.sin(T*1.3+k)*4-T*3)%176+176)%176,y=((T*(8+(k%5)*2.5)+k*13)%58)-4;if(Math.sin(T*6+k*1.7)>-.3)put(x,y,[0xffc4dd,0xff9cc8,0xffffff,0xffe3ef][k%4],1)}
  const bf=sst(.5,.62,p);if(bf>0)for(let k=0;k<3;k++){if(bf<.5&&k)continue;const x=Math.round(40+k*45+22*Math.sin(T*.5+k*2.1)),y=Math.round(30+7*Math.sin(T*.8+k*1.3)),fl=Math.floor(T*9+k)&1,c=[0xffe66b,0xffffff,0x9fd8fa][k];
    put(x,y,DK);put(x-1,y-(fl?1:0),c,1);put(x+1,y-(fl?1:0),c,1);if(!fl){put(x-2,y-1,c,1);put(x+2,y-1,c,1)}}
}
function overlays(){
  if(boom)for(let k=0;k<3;k++){const ph=(T*.45+k/3)%1;if(ph>.9)continue;const nx=Math.round(50+ph*9*(k&1?1:-.4)+Math.sin(ph*9+k)*1.5),ny=Math.round(22-ph*16),c=[0xffd23f,0x7fe3ff,0xff8fc8][k];
    put(nx,ny+3,c,1);put(nx+1,ny+3,c,1);put(nx,ny+2,c,1);put(nx+1,ny+2,c,1);put(nx+1,ny+1,c,1);put(nx+1,ny,c,1);put(nx+1,ny-1,c,1);put(nx+2,ny-1,c,1);put(nx+2,ny,c,1)}
  let ex=false;
  for(const h of hits){const a=T-h;if(a<0||a>.42)continue;if(a<.4)ex=true;
    for(let k=0;k<2;k++){const r=5+a*32-k*4;if(r<2)continue;for(let an=-.7;an<=.7;an+=.1){const ax=Math.round(flock[0]-4-Math.cos(an-.5)*r),ay=Math.round(flock[1]+2-Math.sin(an-.5)*r);if(ay>0&&ay<34)put(ax,ay,k?0xffd98a:0xfff6d8,1)}}}
  if(ex&&inA<.5){const hx=bearHead[0],hy=bearHead[1]-6;R(hx,hy,1,3,0xffd23f);R(hx,hy+4,1,1,0xffd23f);ST({em:1})}
}
function drawScene(sp){
  sky(sp);land(sp);pine(sp);cabin(sp);gramophone(sp);
  pond(sp);snowman(sp);den(sp);tree(sp);stoneLantern(sp);if(sp)flowers();
  bear();geese();rope();particles(sp);overlays();
}
// lighting for one world → F
function finish(sp,F){
  const c=sst(.2,.9,p),wr=lerp(.64,.84,c),wg=lerp(.7,.88,c),wb=lerp(.86,.97,c),ar0=lerp(4,4,c),ag0=lerp(8,6,c),ab0=lerp(22,10,c),sun=sst(.5,.8,p);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const i=y*W+x,v=A[i],e=EM[i],bay=BAY[(y&3)*4+(x&3)];let r=v&255,g=v>>8&255,b=v>>16&255;
    if(y<14&&!e)for(let j=0;j<12;j++)if(glow[j]){const dx=x-BX[j],dy=y-BY[j]-1,d2=dx*dx+dy*dy;if(d2<72){const f=1-Math.sqrt(d2)/8.5;if(f*1.2>bay+.12){const q=BCR[j%5];r+=(q[0]-r)*.4;g+=(q[1]-g)*.4;b+=(q[2]-b)*.4}}}
    if(sp){if(sun>0&&!e&&y<GY+2&&((x+y*1.3+400-T*2)%30)<7&&bay<sun*.34){r+=28;g+=22;b+=4}}
    else{if(!e){r=r*wr+ar0;g=g*wg+ag0;b=b*wb+ab0}
      if(stoveA>.01&&y>30){const dx=x-31,dy=(y-37)*1.5,d=Math.sqrt(dx*dx+dy*dy),I=(d<7?.5:d<12?.32:d<17?.17:d<22?.07:0)*stoveA;r+=I*130;g+=I*84;b+=I*6}} // banded warm pool on the snow
    const o=i*3;F[o]=r;F[o+1]=g;F[o+2]=b}
}
// display = spring behind the knob, winter ahead of it, melting into each other through a 4×4 Bayer edge
function compose(){
  const band=1-sst(.9,1,p);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x,o3=i*3,o=i*4,o2=o+W*H*4,bay=BAY[(y&3)*4+(x&3)];
    let r,g,b;
    if((bxn-x)/11+.5>bay){r=FS[o3];g=FS[o3+1];b=FS[o3+2];const w=1-(bxn-x)/24;if(w>0&&w*band>BAY[((y+2)&3)*4+((x+1)&3)]){r+=24;g+=30;b+=30}} // meltwater shimmer just behind the knob
    else{r=FW[o3];g=FW[o3+1];b=FW[o3+2]}
    OUTC[o]=r;OUTC[o+1]=g;OUTC[o+2]=b;OUTC[o+3]=255;OUTC[o2]=FS[o3];OUTC[o2+1]=FS[o3+1];OUTC[o2+2]=FS[o3+2];OUTC[o2+3]=255}
}

// ═════════════════════════ AUDIO (everything synthesised live)
const BPM=96,SPB=60/BPM,S16=SPB/4;
const CHD=[[50,54,57,61],[54,57,59,62],[55,59,62,66],[57,62,64,67]],RT=[38,35,43,45]; // Dmaj7 · Bm7 · Gmaj7 · A7sus4
const MEL={};[[0,78,3],[4,81,2],[6,78,2],[8,76,4],[12,74,2],[14,76,2],[16,78,3],[20,74,2],[22,71,2],[24,74,4],[28,78,3],[32,79,3],[36,83,2],[38,81,2],[40,79,4],[44,74,2],[46,79,2],[48,81,3],[52,79,2],[54,76,2],[56,74,3],[59,76,2],[61,69,3]].forEach(m=>MEL[m[0]]=m);
const PENT=[62,64,66,69,71,74,76,78,81,83,86,88];
const mtof=n=>440*Math.pow(2,(n-69)/12);
let ac=null,master,musBus,lpf,pump,duck,windBus,birdBus,kalBus,padBus,tuneBus,sfxBus,honkIn,NB,rubG,rubF,tuneO,tuneG,brF,brG,chimeNext=0,birdNext=0,songT0=0,nextT=0,step=0,soundOn=false,userMuted=false;
const lev=[1,0,0,0,0];
const live=()=>ac&&soundOn&&ac.state==='running';
const gn=(dest,v)=>{const g=ac.createGain();g.gain.value=v;g.connect(dest);return g};
const flt=(type,f,q,dest)=>{const b=ac.createBiquadFilter();b.type=type;b.frequency.value=f;b.Q.value=q;b.connect(dest);return b};
const pan=(v,dest)=>{if(!ac.createStereoPanner)return dest;const n=ac.createStereoPanner();n.pan.value=v;n.connect(dest);return n};
function env(g,t,a,pk,d){pk=Math.max(pk,.0002);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(pk,t+a);g.gain.exponentialRampToValueAtTime(.0001,t+a+d)}
function osc(type,f,t,dur,dest){const o=ac.createOscillator();o.type=type;o.frequency.setValueAtTime(f,t);o.connect(dest);o.start(t);o.stop(t+dur);return o}
function noise(t,dur,dest){const s=ac.createBufferSource();s.buffer=NB;s.loop=true;s.connect(dest);s.start(t,Math.random()*1.5);s.stop(t+dur);return s}
function tone(type,f,t,a,pk,d,dest){const g=gn(dest,0);env(g,t,a,pk,d);return osc(type,f,t,a+d+.05,g)}

function initAudio(){
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
  try{ac=new AC()}catch(e){ac=null;return false}
  master=ac.createGain();master.gain.value=0;master.connect(ac.destination);
  const comp=ac.createDynamicsCompressor();comp.threshold.value=-9;comp.ratio.value=4;comp.attack.value=.004;comp.release.value=.2;comp.connect(master);
  const musLvl=gn(comp,.5);duck=gn(musLvl,1);pump=gn(duck,1);
  lpf=flt('lowpass',900,.5,pump);musBus=gn(lpf,1);windBus=gn(duck,0);birdBus=gn(duck,0);
  sfxBus=gn(comp,.9); // ≈5 dB over the music bus
  NB=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate);{const d=NB.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}
  const n=Math.floor(ac.sampleRate*.8),ir=ac.createBuffer(2,n,ac.sampleRate); // short hollow reverb for the kalimba
  for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,3)}
  const cvn=ac.createConvolver();cvn.buffer=ir;cvn.connect(gn(musBus,.42));
  kalBus=gn(musBus,1);kalBus.connect(cvn);padBus=gn(musBus,0);tuneBus=gn(musBus,0);
  // whistled tune: sine + breath, vibrato
  tuneG=gn(tuneBus,0);tuneO=ac.createOscillator();tuneO.type='sine';tuneO.frequency.value=740;tuneO.connect(tuneG);tuneO.start();
  {const l=ac.createOscillator();l.frequency.value=5.2;const lg=ac.createGain();lg.gain.value=7;l.connect(lg);lg.connect(tuneO.frequency);l.start()}
  brG=gn(tuneBus,0);brF=flt('bandpass',740,6,brG);{const s=ac.createBufferSource();s.buffer=NB;s.loop=true;s.connect(brF);s.start()}
  // goose honk chain: soft saturation → pan toward the flock → straight to master
  const sh=ac.createWaveShaper(),cu=new Float32Array(1024);for(let i=0;i<1024;i++)cu[i]=Math.tanh((i/511.5-1)*2.2);sh.curve=cu;sh.connect(pan(.5,gn(master,.8)));honkIn=gn(sh,1);
  // winter wind: howling band-passed noise
  {const wg=gn(windBus,.2),wf=flt('bandpass',520,2.2,wg),s=ac.createBufferSource();s.buffer=NB;s.loop=true;s.connect(wf);s.start();
   const l=ac.createOscillator();l.frequency.value=.11;const lf=ac.createGain();lf.gain.value=230;l.connect(lf);lf.connect(wf.frequency);
   const l2=ac.createOscillator();l2.frequency.value=.07;const lg=ac.createGain();lg.gain.value=.1;l2.connect(lg);lg.connect(wg.gain);l.start();l2.start()}
  rubG=gn(sfxBus,0);rubF=flt('bandpass',600,1.3,rubG);{const s=ac.createBufferSource();s.buffer=NB;s.loop=true;s.connect(rubF);s.start()}
  songT0=ac.currentTime+.08;nextT=songT0;step=0;chimeNext=birdNext=ac.currentTime+.4;
  setInterval(sched,25);return true;
}
function kal(t,n,v){const f=mtof(n+12);tone('sine',f,t,.002,v,.6,kalBus);tone('sine',f*5.9,t,.001,v*.22,.05,kalBus);const g=gn(kalBus,0);env(g,t,.001,v*.25,.012);noise(t,.03,flt('bandpass',3200,1.5,g))}
function kick(t,v){const g=gn(musBus,0);env(g,t,.002,v,.27);const o=osc('sine',140,t,.35,g);o.frequency.exponentialRampToValueAtTime(46,t+.11)}
function rim(t,v){tone('triangle',820,t,.001,v,.035,musBus);const g=gn(musBus,0);env(g,t,.001,v*.7,.05);noise(t,.08,flt('bandpass',2400,1.2,g))}
function shaker(t,v,d){const g=gn(musBus,0);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+d*.4);g.gain.exponentialRampToValueAtTime(.0001,t+d);noise(t,d+.03,flt('highpass',5200,.7,g))}
function clap(t,v){const f=flt('bandpass',1250,1.1,musBus);for(let k=0;k<3;k++){const g=gn(f,0);env(g,t+k*.011,.001,v*(k===2?1:.6),k===2?.16:.012);noise(t+k*.011,.2,g)}}
function tamb(t,v){const g=gn(musBus,0);env(g,t,.001,v,.13);noise(t,.18,flt('highpass',6500,.8,g));tone('square',8200,t,.001,v*.05,.08,musBus)}
function bass(t,n,v,d){const f=mtof(n),g=gn(flt('lowpass',420,.7,musBus),0);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.012);g.gain.setValueAtTime(v*.8,t+d*.7);g.gain.linearRampToValueAtTime(0,t+d);osc('sine',f,t,d+.02,g);osc('triangle',f*2,t,d+.02,gn(g,.35))}
function sub(t,n,v,d){const f=mtof(n),g=gn(musBus,0);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.01);g.gain.linearRampToValueAtTime(0,t+d);osc('sine',f,t,d+.02,g);osc('sine',f*2,t,d+.02,gn(g,.3))}
function pad(t,ch){const d=S16*16,g=gn(flt('lowpass',1150,.5,padBus),0);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(1,t+.4);g.gain.setValueAtTime(1,t+d-.1);g.gain.linearRampToValueAtTime(0,t+d+.5);
  ch.forEach(n=>{[-7,7].forEach(dt=>{const o=osc('sawtooth',mtof(n),t,d+.55,gn(g,.022));o.detune.value=dt})})}
function tune(t,n,len){const d=len*S16*.92,f=mtof(n);tuneO.frequency.setValueAtTime(f,t);brF.frequency.setValueAtTime(f,t);
  for(const q of[[tuneG.gain,.11],[brG.gain,.5]]){q[0].setValueAtTime(0,t);q[0].linearRampToValueAtTime(q[1],t+.03);q[0].linearRampToValueAtTime(q[1]*.7,t+d-.04);q[0].linearRampToValueAtTime(0,t+d)}}
function playStep(s,t){
  const bar=s>>4,st=s&15,ch=CHD[bar],L1=lev[1],L2=lev[2],L4=lev[4],lo=L2*(1-L4);
  if(L1>.01&&!(st&1)){const k=st>>1;kal(t,ch[[0,2,1,3,2,3,1,2][k]]+(bar===3&&k>5?12:0),L1*(k&1?.11:.16));if(st===0)kal(t,ch[0]-12,L1*.11)}
  if(lo>.01){if(st===0||st===10||(st===6&&(bar&1)))kick(t,lo*.75);if(st===4||st===12)rim(t,lo*.3);if(!(st&1))shaker(t,lo*(st%4===2?.13:.08),.06);else shaker(t,lo*.04,.04);
    if(st===0)bass(t,RT[bar],lo*.42,S16*5);if(st===6)bass(t,RT[bar],lo*.32,S16*2);if(st===10)bass(t,RT[bar]+7,lo*.36,S16*3);if(st===14&&bar===3)bass(t,RT[bar]+12,lo*.3,S16*2)}
  if(st===0)pad(t,ch);
  const m=MEL[s];if(m)tune(t,m[1],m[2]);
  if(L4>.01){
    if(st%4===0){kick(t,L4*.95);pump.gain.setValueAtTime(1-.55*L4,t);pump.gain.linearRampToValueAtTime(1,t+.27)}
    if(st===4||st===12)clap(t,L4*.38);
    if(st%4===2)tamb(t,L4*.2);else if(st&1)shaker(t,L4*.06,.04);
    if(st%4===2)sub(t,RT[bar]+12,L4*.5,S16*1.7);if(st%4===3)sub(t,RT[bar]+12,L4*.38,S16*.9)}
}
function sched(){
  if(!ac||ac.state!=='running')return;const now=ac.currentTime;
  if(nextT<now-.3){const k=Math.ceil((now-nextT)/S16);nextT+=k*S16;step=(step+k)%64}
  while(nextT<now+.12){playStep(step,nextT+((step&1)?S16*.13:0));nextT+=S16;step=(step+1)%64}
  if(chimeNext<now)chimeNext=now+.05; // ice chimes in the wind
  while(chimeNext<now+.2){const f=mtof(PENT[5+((Math.random()*7)|0)]+12);tone('sine',f,chimeNext,.002,.035,1.1,pan(Math.random()*1.6-.8,windBus));tone('sine',f*2.76,chimeNext,.002,.012,.3,windBus);chimeNext+=.5+Math.random()*1.4}
  if(birdNext<now)birdNext=now+.05;   // spring birdsong
  while(birdNext<now+.2){const k=2+((Math.random()*3)|0),f0=2400+Math.random()*1500,d=pan(Math.random()*1.6-.8,birdBus);
    for(let j=0;j<k;j++){const tt=birdNext+j*.11,o=tone('sine',f0,tt,.01,.05,.07,d);o.frequency.exponentialRampToValueAtTime(f0*1.5,tt+.04);o.frequency.exponentialRampToValueAtTime(f0*1.15,tt+.09)}
    birdNext+=.7+Math.random()*1.8}
}
const beatNow=()=>ac&&ac.state==='running'?Math.max(0,(ac.currentTime-songT0)/SPB):T/SPB;
const sfx={
  grab(){if(!live())return;const t=ac.currentTime;[[2637,.14,.45],[7278,.06,.2],[11900,.025,.09]].forEach(q=>tone('sine',q[0],t,.002,q[1],q[2],sfxBus));
    const o=tone('sine',190,t,.006,.3,.11,sfxBus);o.frequency.exponentialRampToValueAtTime(440,t+.075)},
  release(){if(!live())return;const t=ac.currentTime,o=tone('sine',430,t,.004,.32,.13,sfxBus);o.frequency.exponentialRampToValueAtTime(150,t+.1)},
  drip(i,on){if(!live())return;const t=ac.currentTime,f=mtof(PENT[i]);
    if(on){const o=tone('sine',f*1.6,t,.002,.24,.32,sfxBus);o.frequency.exponentialRampToValueAtTime(f,t+.03);tone('sine',f*2,t,.002,.06,.12,sfxBus)}
    else{tone('triangle',f*.5,t,.003,.06,.4,sfxBus);const g=gn(sfxBus,0);env(g,t,.001,.07,.03);noise(t,.05,flt('highpass',5000,.7,g))}},
  latch(){if(!live())return;const t=ac.currentTime;[0,.075].forEach(d=>{const g=gn(sfxBus,0);env(g,t+d,.001,.34,.012);noise(t+d,.04,flt('highpass',2600,.7,g));tone('sine',150,t+d,.001,.18,.04,sfxBus)})},
  yawn(){if(!live())return;const t=ac.currentTime,g=gn(sfxBus,0),o=ac.createOscillator();o.type='sawtooth';
    o.frequency.setValueAtTime(170,t);o.frequency.linearRampToValueAtTime(330,t+.22);o.frequency.linearRampToValueAtTime(190,t+.6);
    o.connect(flt('bandpass',700,3,g));o.connect(flt('bandpass',1150,4,g));
    g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.5,t+.12);g.gain.setValueAtTime(.5,t+.35);g.gain.linearRampToValueAtTime(.0001,t+.65);o.start(t);o.stop(t+.7)},
  crack(){if(!live())return;const t=ac.currentTime;[0,.09,.21].forEach((d,k)=>{const g=gn(sfxBus,0);env(g,t+d,.001,k?.2:.4,.03);noise(t+d,.06,flt('bandpass',2600+k*900,1,g))});
    const o=tone('sine',150,t,.003,.4,.2,sfxBus);o.frequency.exponentialRampToValueAtTime(62,t+.16)},
  slide(){if(!live())return;const t=ac.currentTime,o=tone('sine',920,t,.01,.2,.36,sfxBus);o.frequency.exponentialRampToValueAtTime(260,t+.34);
    const g=gn(sfxBus,0);env(g,t+.34,.004,.2,.18);const f=flt('lowpass',2400,.7,g);f.frequency.exponentialRampToValueAtTime(500,t+.5);noise(t+.34,.25,f)},
  riser(){if(!live())return;const t=ac.currentTime,g=gn(sfxBus,0),f=flt('bandpass',300,3,g);f.frequency.setValueAtTime(300,t);f.frequency.exponentialRampToValueAtTime(7000,t+.5);
    g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.4,t+.48);g.gain.linearRampToValueAtTime(.0001,t+.54);noise(t,.6,f);
    const o=tone('sawtooth',180,t,.4,.07,.14,sfxBus);o.frequency.exponentialRampToValueAtTime(1400,t+.5);
    const c=gn(sfxBus,0);env(c,t+.5,.002,.42,1.3);noise(t+.5,1.5,flt('highpass',3600,.6,c))},
  brake(){if(!live())return;const t=ac.currentTime,g=gn(flt('lowpass',1300,1,sfxBus),0),o=osc('sawtooth',330,t,.7,g);o.frequency.exponentialRampToValueAtTime(32,t+.6);
    g.gain.setValueAtTime(.26,t);g.gain.linearRampToValueAtTime(.0001,t+.62);const n=gn(sfxBus,0);env(n,t,.004,.2,.3);const f=flt('bandpass',1800,2,n);f.frequency.exponentialRampToValueAtTime(260,t+.4);noise(t,.5,f)},
  land(){if(!live())return;const t=ac.currentTime,g=gn(sfxBus,0);env(g,t,.005,.4,.4);const f=flt('lowpass',3000,.7,g);f.frequency.exponentialRampToValueAtTime(400,t+.4);noise(t,.5,f);
    [.18,.34].forEach(d=>{const q=gn(sfxBus,0);env(q,t+d,.006,.4,.09);const o=ac.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(560,t+d);o.frequency.exponentialRampToValueAtTime(430,t+d+.1);o.connect(flt('bandpass',1500,3,q));o.start(t+d);o.stop(t+d+.14)})},
  honk(){if(!live())return;const t0=ac.currentTime+.01;for(let k=0;k<3;k++){const t=t0+k*.27,g=gn(honkIn,0),o=ac.createOscillator(),l=ac.createOscillator(),lg=ac.createGain();
    o.type='sawtooth';o.frequency.setValueAtTime(300,t);o.frequency.exponentialRampToValueAtTime(410,t+.035);o.frequency.exponentialRampToValueAtTime(330,t+.19); // “ha-onk”
    o.connect(flt('bandpass',780,3,g));o.connect(flt('bandpass',1550,4,g));const lo=gn(g,.5);o.connect(flt('lowpass',420,.7,lo));
    g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(1.5,t+.02);g.gain.setValueAtTime(1.3,t+.12);g.gain.exponentialRampToValueAtTime(.0001,t+.22);
    l.frequency.value=58;lg.gain.value=.45;l.connect(lg);lg.connect(g.gain);o.start(t);l.start(t);o.stop(t+.25);l.stop(t+.25);
    duck.gain.setTargetAtTime(.45,t,.008);duck.gain.setTargetAtTime(1,t+.12,.12)}} // music ducks to ~45 %
};

// ═════════════════════════ DOM + GL
const cv=document.getElementById('cv'),stage=document.getElementById('stage'),btn=document.getElementById('snd');
const rc=document.getElementById('rc'),rl=document.getElementById('rl'),rm=document.getElementById('rm'),root=document.documentElement;
const PADX=22,PADY=27,CWU=W+PADX*2,CHU=H+PADY*2;
const gl=cv.getContext('webgl2',{antialias:false,alpha:false,powerPreference:'high-performance'});
const VS=`#version 300 es
void main(){vec2 v=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(v*2.-1.,0.,1.);}`;
const FSH=`#version 300 es
precision highp float;
uniform sampler2D uTex;uniform vec2 uRes;uniform float uS;uniform vec3 uBg;uniform float uDay;
uniform vec3 uK;uniform vec2 uSt;uniform vec3 uE;uniform vec3 uEA;
out vec4 o;
const vec2 PAD=vec2(22.,27.),RS=vec2(176.,50.);
const float KR=15.,KH=30.;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+1.),f.x),f.y);}
float sdRR(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
float sdBez(vec2 cp){return sdRR(cp,RS*.5+6.,28.);}
vec3 room(vec2 p,float lit){ivec2 t=ivec2(clamp(floor(p-PAD),vec2(0.),RS-1.));t.y+=int(lit)*50;return texelFetch(uTex,t,0).rgb;}
vec3 scene(vec2 p,float lit){
  vec2 cp=p-PAD-RS*.5;
  float dt=sdRR(cp,RS*.5,22.),db=sdBez(cp);
  float sh=1.-smoothstep(-8.,13.,sdRR(cp-vec2(0.,5.),RS*.5+4.,26.));          // drop shadow, gone before the canvas edge
  vec3 c=mix(uBg,vec3(.03,.05,.10),sh*sh*mix(.6,.28,uDay));
  if(db<1.){ // moulded bezel: frosted aluminium in winter, cream enamel in spring
    float t=clamp(-db/6.,0.,1.),day=max(uDay,lit);
    vec2 n=normalize(vec2(sdBez(cp+vec2(.5,0.))-sdBez(cp-vec2(.5,0.)),sdBez(cp+vec2(0.,.5))-sdBez(cp-vec2(0.,.5)))+1e-5);
    float l=dot(n,normalize(vec2(-.3,-1.)))*cos(t*3.14159);
    vec3 bz=mix(vec3(.56,.64,.74),vec3(.97,.945,.90),day)*(1.+l*mix(.3,.11,day));
    bz+=smoothstep(.26,0.,abs(t-.3))*max(-n.y,0.)*mix(.12,.05,day);
    bz+=(1.-day)*(step(.978,h21(floor(p*uS/2.)))*.16+ (vn(p*1.7)-.5)*.07);     // rime sparkle
    bz*=1.-.3*smoothstep(1.6,0.,dt);
    c=mix(c,clamp(bz,0.,1.),clamp(.5-db*uS,0.,1.));
  }
  if(dt<1.){
    vec3 r=room(p,lit);
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
  for(int i=0;i<3;i++){ // crescent echoes trailing the knob, mint → blossom pink
    float ex=uE[i],side=sign(uK.x-ex);vec2 qe=p-vec2(ex,uK.y);
    vec2 a=vec2(qe.x,qe.y-clamp(qe.y,-8.,8.));float de=length(a)-KR;
    float ring=1.25*smoothstep(3.2,0.,abs(de+2.5))+.4*exp(-abs(de+2.5)/5.);
    c+=mix(vec3(.45,1.,.72),vec3(1.,.45,.75),float(i)*.5)*ring*clamp(-qe.x*side/KR,0.,1.)*uEA[i]*inT;
  }
  float dsh=knob(p-vec2(2.5,4.),q,g);                       // soft shadow on the scene
  c*=1.-.36*(1.-smoothstep(-4.,7.,dsh))*mix(.3,1.,inB);
  vec2 f=(p-uK.xy-vec2(1.,KH*uSt.y-2.))/vec2(10.,3.4);      // light gathered toward the foot
  c+=vec3(1.,.93,.75)*exp(-dot(f,f))*.32*inB;
  float d=knob(p,q,g);
  if(d<1.){
    float m=clamp(1.+d/(KR*min(uSt.x,uSt.y)),0.,1.);
    vec2 base=uK.xy+(p-uK.xy)/1.28;float bend=pow(m,2.6)*9.; // magnify ~1.28×, bend toward the rim, split R/G/B there
    vec3 k=vec3(scene(base+g*bend*.78,1.).r,scene(base+g*bend,1.).g,scene(base+g*bend*1.24,1.).b);
    k*=1.-.4*smoothstep(.6,.84,m)*(1.-smoothstep(.9,.99,m)); // darker refraction band
    k=mix(k,mix(vec3(.78,.9,1.),vec3(1.,.95,.92),uDay),pow(m,3.)*.3); // fresnel tint
    k+=smoothstep(.9,1.,m)*.5;                               // bright edge
    k=mix(k,vec3(1.),.045);
    float fr=vn(q*.8+3.)*.55+vn(q*2.4)*.45;                  // rime on the side that still faces winter
    k=mix(k,vec3(.92,.97,1.),smoothstep(.3,1.,m)*smoothstep(-.4,.9,g.x)*smoothstep(.38,.62,fr)*(1.-uDay)*.6);
    float hs=min(sdSeg(q,vec2(-KR*.5,-(KH-KR)*.95),vec2(-KR*.52,3.)),sdSeg(q,vec2(-KR*.5,-(KH-KR)*.95),vec2(-KR*.22,-(KH-KR)-KR*.58)));
    k+=smoothstep(2.3,.3,hs)*.5;                             // long soft streak, upper left
    k+=smoothstep(2.,.8,length(q-vec2(KR*.42,(KH-KR)+KR*.2)))*.9; // small dot, lower right
    c=mix(c,k,clamp(.5-d*uS,0.,1.));
  }
  o=vec4(clamp(c,0.,1.),1.);
}`;
let prog_,U={},scale=1;
function fail(msg){const d=document.createElement('p');d.className='err';d.textContent=msg;stage.replaceChildren(d)}
function initGL(){
  if(!gl){fail('This study needs WebGL2, which this browser did not provide.');return false}
  const mk=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s};
  try{prog_=gl.createProgram();gl.attachShader(prog_,mk(gl.VERTEX_SHADER,VS));gl.attachShader(prog_,mk(gl.FRAGMENT_SHADER,FSH));gl.linkProgram(prog_);
    if(!gl.getProgramParameter(prog_,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(prog_))}
  catch(e){console.error(e);fail('The shader failed to compile on this device.');return false}
  gl.useProgram(prog_);['uTex','uRes','uS','uBg','uDay','uK','uSt','uE','uEA'].forEach(n=>U[n]=gl.getUniformLocation(prog_,n));
  gl.bindVertexArray(gl.createVertexArray());
  gl.bindTexture(gl.TEXTURE_2D,gl.createTexture());
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,W,H*2,0,gl.RGBA,gl.UNSIGNED_BYTE,OUT8);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST); // never smoothed
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.uniform1i(U.uTex,0);return true;
}
function resize(){
  const dpr=window.devicePixelRatio||1,w=Math.max(160,stage.clientWidth);
  scale=Math.max(1,Math.floor(w*dpr/CWU)); // whole device pixels per scene pixel, as many as fit
  if(cv.width!==CWU*scale){cv.width=CWU*scale;cv.height=CHU*scale}
  cv.style.width=(CWU*scale/dpr)+'px';cv.style.height=(CHU*scale/dpr)+'px';
}

// ═════════════════════════ INTERACTION + PHYSICS
let tp=0,kp=0,kv=0,wob=0,wv=0,drag=null,last=0,partyOn=false,entered=false,awake=false,kt=.6,ck1=false,ck2=false,hatDown=false;
const ech=[0,0,0];
function audioStart(){if(userMuted)return;if(!ac&&!initAudio())return;if(ac.state!=='running')ac.resume().catch(()=>{});setSound(true)}
function setSound(on){soundOn=on;if(ac)master.gain.setTargetAtTime(on?1:0,ac.currentTime,.04);btn.textContent=on?'Sound on':'Sound off';btn.setAttribute('aria-pressed',on?'true':'false')}
btn.addEventListener('click',()=>{if(!ac||!soundOn){userMuted=false;audioStart()}else{userMuted=true;setSound(false)}});
const unitCss=()=>cv.getBoundingClientRect().width/CWU;
function onSwitch(e){const r=cv.getBoundingClientRect(),u=r.width/CWU,x=(e.clientX-r.left)/u,y=(e.clientY-r.top)/u;return x>PADX-9&&x<PADX+W+9&&y>PADY-9&&y<PADY+H+9}
cv.addEventListener('pointerdown',e=>{if(e.button||!onSwitch(e))return;try{cv.setPointerCapture(e.pointerId)}catch(_){}
  tp=clamp(kp,0,1);drag={id:e.pointerId,x:e.clientX,tp0:tp,moved:false};cv.classList.add('drag');audioStart();sfx.grab()});
cv.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.x;if(Math.abs(dx)>4)drag.moved=true;
  if(drag.moved)tp=clamp(drag.tp0+dx/((KX1-KX0)*unitCss()),0,1)});
function endDrag(e,cancel){if(!drag||e.pointerId!==drag.id)return;if(!drag.moved&&!cancel)tp=kp<.5?1:0;drag=null;cv.classList.remove('drag');audioStart();sfx.release()}
cv.addEventListener('pointerup',e=>endDrag(e,false));cv.addEventListener('pointercancel',e=>endDrag(e,true));
cv.addEventListener('click',audioStart);
cv.addEventListener('keydown',e=>{let h=true;
  switch(e.key){case'ArrowRight':case'ArrowUp':tp=clamp(tp+.05,0,1);break;case'ArrowLeft':case'ArrowDown':tp=clamp(tp-.05,0,1);break;
    case'PageUp':tp=clamp(tp+.2,0,1);break;case'PageDown':tp=clamp(tp-.2,0,1);break;
    case'Home':tp=0;break;case'End':tp=1;break;case' ':case'Enter':tp=tp<.5?1:0;break;default:h=false}
  if(h){e.preventDefault();audioStart()}});
document.addEventListener('visibilitychange',()=>{if(!ac)return;if(document.hidden)ac.suspend();else if(soundOn)ac.resume().catch(()=>{})});

const BGS=[[0,22,34,50],[.35,38,54,76],[.6,146,140,160],[.8,234,216,222],[1,247,237,232]];
const tempOf=v=>{const d=Math.round(-12+30*v);return(d<0?'−':d>0?'+':'')+Math.abs(d)+'°C'};
const seasonOf=v=>v<.15?'Deep winter':v<.38?'First drip':v<.6?'Thaw':v<.86?'Spring':'Festival';
let bg=[22,34,50],lastBg=-1,lastDark=null,lastT='',lastL='',lastM='',lastVal=-1;
function ui(){
  let k=0;while(k<BGS.length-2&&p>BGS[k+1][0])k++;const a=BGS[k],b=BGS[k+1],f=clamp((p-a[0])/(b[0]-a[0]),0,1);
  bg=[1,2,3].map(i=>Math.round(lerp(a[i],b[i],f)));const key=bg[0]<<16|bg[1]<<8|bg[2];
  if(key!==lastBg){lastBg=key;root.style.setProperty('--bg',`rgb(${bg[0]},${bg[1]},${bg[2]})`)}
  const dark=p>.57;if(dark!==lastDark){lastDark=dark;const c=dark?'52,36,48':'230,240,250';
    root.style.setProperty('--fg',`rgb(${c})`);root.style.setProperty('--mut',`rgba(${c},${dark?.7:.66})`);root.style.setProperty('--line',`rgba(${c},.2)`)}
  const tm=tempOf(p),li=seasonOf(p),mu=p<.12?'Wind':p<.36?'Kalimba':p<.58?'Beat':p<.86?'Band':'Festival';
  if(tm!==lastT){lastT=tm;rc.textContent=tm}if(li!==lastL){lastL=li;rl.textContent=li}if(mu!==lastM){lastM=mu;rm.textContent=mu}
  const v=Math.round(tp*100);if(v!==lastVal){lastVal=v;cv.setAttribute('aria-valuenow',v);cv.setAttribute('aria-valuetext',tempOf(tp)+', '+seasonOf(tp))}
}

function frame(now){
  requestAnimationFrame(frame);
  const t=now/1000,dt=clamp(t-last,0,.05);last=t;T+=dt;
  // spring: the knob lags the finger; a second damped spring, fed by acceleration, makes it wobble
  const n=4,h=dt/n;for(let i=0;i<n;i++){const acc=230*(tp-kp)-16.5*kv;kv+=acc*h;kp+=kv*h;
    if(kp<0){kp=0;if(kv<0)kv*=-.28}else if(kp>1){kp=1;if(kv>0)kv*=-.28}
    wv+=(-310*wob-9*wv-acc*.36)*h;wob+=wv*h}
  p=clamp(kp,0,1);
  const sx=1+Math.min(.3,Math.abs(kv)*.055),kxr=KX0+p*(KX1-KX0); // stretch with speed, squash vertically to keep volume
  beat=beatNow();pulse=Math.max(0,1-(beat%1)*2.4);
  // the story, by position
  bxn=kxr+(p-.5)*60;fx=kxr+14;
  const lx=kxr-6+(p-.5)*20;
  for(let i=0;i<12;i++){const on=lx>BX[i];if(on!==lit[i]){lit[i]=on;if(on)dripT[i]=T;sfx.drip(i,on)}glow[i]=on&&!(partyOn&&((Math.floor(beat*2)+i)%4===0))}
  const so=stoveOn?p>.085:p>.1;if(so!==stoveOn){stoveOn=so;sfx.latch()}stoveA+=((stoveOn?1:0)-stoveA)*(1-Math.exp(-dt*18));
  const aw=awake?p>.18:p>.2;if(aw!==awake){awake=aw;if(aw)sfx.yawn()}
  const c1=fx>64,c2=fx>84;if(c1!==ck1){ck1=c1;if(c1)sfx.crack()}if(c2!==ck2){ck2=c2;if(c2)sfx.crack()}
  const hd=prog(56,30)>.85;if(hd!==hatDown){hatDown=hd;if(hd)sfx.slide()}
  const po=partyOn?p>.84:p>=.86;if(po!==partyOn){partyOn=po;po?sfx.riser():sfx.brake()}party+=((partyOn?1:0)-party)*(1-Math.exp(-dt*4));
  const en=entered?p>.93:p>=.965;if(en!==entered){entered=en;if(en)sfx.land()}inA+=((entered?1:0)-inA)*(1-Math.exp(-dt*3.5));
  waiting=p>=.8&&!entered;
  if(waiting){kt-=dt;if(kt<=0){kt=2.8;hits.push(T,T+.27,T+.54);sfx.honk()}}else kt=.7;
  while(hits.length&&T-hits[0]>.6)hits.shift();
  shake=0;for(const hh of hits){const a=T-hh;if(a>=0&&a<.08)shake=2}
  flock=[150+9*Math.sin(T*.6),8+2*Math.sin(T*.9)];
  boom=p>.36;
  bearSt=p<.2?0:p<.38?1:p<.55?2:p<.86?3:4;bearTgt=bearSt<3?110:bearSt===3?lerp(114,128,sst(.55,.8,p)):128;
  {const d=bearTgt-bearX,s=Math.min(Math.abs(d),dt*16);if(Math.abs(d)>.01){bearX+=Math.sign(d)*s;bearDir=Math.sign(d);walkPh+=s*.45}}
  const kxc=PADX+kxr,rates=[13,7.5,4.5],ea=[0,0,0];
  for(let i=0;i<3;i++){ech[i]+=(kxc-ech[i])*(1-Math.exp(-dt*rates[i]));ea[i]=clamp(Math.abs(kxc-ech[i])/5,0,1)*(1-i*.18)}
  // layers fade in with position
  lev[0]=1-sst(.12,.42,p);lev[1]=sst(.08,.2,p)*(1-.55*sst(.86,.95,p));lev[2]=sst(.34,.44,p);lev[3]=sst(.56,.68,p);lev[4]=sst(.84,.9,p);
  if(ac){const ct=ac.currentTime;windBus.gain.setTargetAtTime(lev[0]*.9,ct,.08);birdBus.gain.setTargetAtTime(sst(.42,.7,p)*.8*(1-.5*lev[4]),ct,.08);
    padBus.gain.setTargetAtTime(lev[3]*(1-.3*lev[4]),ct,.08);tuneBus.gain.setTargetAtTime(lev[3],ct,.08);
    lpf.frequency.setTargetAtTime(Math.min(18000,900*Math.pow(2,p*5.2)),ct,.06);
    const sp=Math.abs(kv);rubG.gain.setTargetAtTime(Math.min(.2,sp*.1),ct,.03);rubF.frequency.setTargetAtTime(500+Math.min(3200,sp*1300),ct,.03)}
  ui();
  drawScene(false);finish(false,FW);drawScene(true);finish(true,FS);compose();
  gl.viewport(0,0,cv.width,cv.height);
  gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,W,H*2,gl.RGBA,gl.UNSIGNED_BYTE,OUT8);
  gl.uniform2f(U.uRes,cv.width,cv.height);gl.uniform1f(U.uS,scale);gl.uniform3f(U.uBg,bg[0]/255,bg[1]/255,bg[2]/255);
  gl.uniform1f(U.uDay,sst(.3,.8,p));gl.uniform3f(U.uK,kxc,PADY+H/2,clamp(wob,-.3,.3));gl.uniform2f(U.uSt,sx,1/sx);
  gl.uniform3f(U.uE,ech[0],ech[1],ech[2]);gl.uniform3f(U.uEA,ea[0],ea[1],ea[2]);
  gl.drawArrays(gl.TRIANGLES,0,3);
}
if(initGL()){resize();ech.fill(PADX+KX0);
  if(window.ResizeObserver)new ResizeObserver(resize).observe(stage);window.addEventListener('resize',resize);
  requestAnimationFrame(frame)}
})();
