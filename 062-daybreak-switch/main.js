// Daybreak Switch — Material Studies No. 062
// Raw WebGL2 + Web Audio + a 176×50 CPU pixel buffer. No libraries.
(()=>{'use strict';
const clamp=(x,a,b)=>x<a?a:x>b?b:x,lerp=(a,b,t)=>a+(b-a)*t,sst=(a,b,x)=>{x=clamp((x-a)/(b-a),0,1);return x*x*(3-2*x)};
// ───────────────────────── pixel room (176×50, CPU, every frame)
const W=176,H=50,KX0=16,KX1=160;
const A=new Uint32Array(W*H),EM=new Uint8Array(W*H),L=new Int32Array(W*H);
const OUTC=new Uint8ClampedArray(W*H*2*4),OUT8=new Uint8Array(OUTC.buffer);
const BAY=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v=>(v+.5)/16);
const pk=h=>0xff000000|((h&255)<<16)|(h&0xff00)|(h>>>16&255);
const mixc=(a,b,t)=>{const r=a>>16&255,g=a>>8&255,c=a&255;return((r+((b>>16&255)-r)*t)<<16)|((g+((b>>8&255)-g)*t)<<8)|(c+((b&255)-c)*t)};
function put(x,y,c,e){x=Math.floor(x);y=Math.floor(y);if(x<0||y<0||x>=W||y>=H)return;const i=y*W+x;A[i]=pk(c);EM[i]=e|0}
function fill(x,y,w,h,c,e){for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)put(i,j,c,e)}
function mixPut(x,y,c,a,e){if(x<0||y<0||x>=W||y>=H)return;const v=A[y*W+x],o=((v&255)<<16)|(v&0xff00)|(v>>16&255);put(x,y,mixc(o,c,a),e)}
// scratch layer → stamp with automatic 1-px outline, light top, dark bottom
let bx0=W,by0=H,bx1=-1,by1=-1;
function P(x,y,c){x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=W||y>=H)return;L[y*W+x]=c|0x1000000;if(x<bx0)bx0=x;if(x>bx1)bx1=x;if(y<by0)by0=y;if(y>by1)by1=y}
function R(x,y,w,h,c){x=Math.round(x);y=Math.round(y);for(let j=0;j<h;j++)for(let i=0;i<w;i++)P(x+i,y+j,c)}
function E(cx,cy,rx,ry,c){for(let y=Math.ceil(cy-ry);y<=cy+ry;y++)for(let x=Math.ceil(cx-rx);x<=cx+rx;x++){const dx=(x-cx)/(rx+.3),dy=(y-cy)/(ry+.3);if(dx*dx+dy*dy<=1)P(x,y,c)}}
function LN(x0,y0,x1,y1,c){const n=Math.max(1,Math.round(Math.max(Math.abs(x1-x0),Math.abs(y1-y0))));for(let k=0;k<=n;k++)P(x0+(x1-x0)*k/n,y0+(y1-y0)*k/n,c)}
const OL=0x2b2138;
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
let p=0,T=0,beat=0,pulse=0,bxn=-14,lampOn=false,lampA=0,party=0,inA=0,waiting=false,shake=0,boom=false;
let catX=67,catDir=1,walkPh=0,catSt=0,catTgt=67,catHead=[62,36];
const lit=new Array(12).fill(false),glow=new Array(12).fill(false),hits=[];
const wireY=x=>{const f=((x+2)%29.7)/29.7;return Math.round(13.6*f*(1-f))};
const BX=[],BY=[];for(let i=0;i<12;i++){BX[i]=Math.round(10+i*13.9);BY[i]=wireY(BX[i])+1}
const BC=[0xff6b6b,0xffd23f,0x6fe7b7,0x6fa8ff,0xff8fc8];
const BCR=BC.map(c=>[c>>16&255,c>>8&255,c&255]);
const O=0xf29a3e,SR=0xd07a28,CR=0xfbe3b8,DK=0x2b2138;
const STARS=[[52,9],[57,12],[61,9],[65,13],[72,10],[75,14],[81,9],[84,13],[55,16],[70,17],[79,18],[63,18]];
const TOWN=[[50,5,4],[55,4,6],[59,6,3],[65,3,7],[68,5,5],[73,4,4],[77,6,6],[83,4,3]];
const sput=(x,y,c)=>{x=Math.round(x);y=Math.round(y);if(x>=50&&x<87&&y>=8&&y<24)put(x,y,c,1)};

function sky(){
  const nd=sst(.16,.44,p),dd=sst(.5,.76,p);
  const top=mixc(mixc(0x121742,0x6b4aa0,nd),0x58b0ee,dd),bot=mixc(mixc(0x2b3276,0xffb98a,nd),0xc4e9fb,dd);
  for(let y=8;y<24;y++)for(let x=50;x<87;x++){const f=clamp((y-8)/15+(BAY[(y&3)*4+(x&3)]-.5)*.16,0,1);put(x,y,mixc(top,bot,Math.round(f*5)/5),1)}
  STARS.forEach((s,k)=>{if(nd<.2+(k%4)*.2){const tw=Math.sin(T*(1.3+k*.37)+k*2.1);if(tw>-.55)sput(s[0],s[1],tw>.55?0xffffff:0xaab4f5)}});
  const mx=79,my=11+nd*17; // crescent moon, setting
  for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++)if(dx*dx+dy*dy<=7.5&&(dx-1.5)*(dx-1.5)+(dy+.8)*(dy+.8)>5.2)sput(mx+dx,my+dy,0xfff3c4);
  const rise=sst(.28,.8,p),sx=57+rise*15,sy=26-rise*16,sc=mixc(0xff8a4a,0xfff1a0,dd); // sun
  if(rise>0){for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const d=dx*dx+dy*dy;if(d<=10.5)sput(sx+dx,sy+dy,d<=4?mixc(sc,0xffffff,.35):sc);else if(d<=20&&((dx+dy)&1)&&dd>.4&&Math.sin(T*2+dx)>-.3)sput(sx+dx,sy+dy,0xfff6c8)}}
  if(dd>.2)for(let k=0;k<3;k++){const cx=44+((T*1.3+k*19)%52),cy=10+k*3+(k===2?-5:0),half=(dd<.65);
    for(let dx=-4;dx<=4;dx++){if(half&&(dx&1))continue;if(Math.abs(dx)<=2)sput(cx+dx,cy,0xffffff);sput(cx+dx,cy+1,Math.abs(dx)>2?0xffffff:0xdcecfa)}}
  TOWN.forEach((b,k)=>{const top=24-b[2],wall=mixc(mixc(k&1?0x1d1e44:0x161736,k&1?0x5a3d73:0x47305f,nd),k&1?0xa594c4:0x8f7fb5,dd),roof=mixc(mixc(0x24255a,0x8a4f77,nd),k&1?0xe8806a:0x4fb0a6,dd);
    for(let y=top;y<24;y++)for(let x=b[0];x<b[0]+b[1];x++)sput(x,y,y===top?roof:wall);
    if(nd<.55+.1*(k%3)){if((k*7+3)%5!==0)sput(b[0]+1,top+2,0xffd76a);if(b[2]>4&&k%2===0)sput(b[0]+b[1]-2,top+4,0xffc24a)}
    else if(dd>.5&&b[2]>3)sput(b[0]+1,top+2,0xdff3ff)});
}

function catWalk(cx,dir){
  const ph=Math.floor(walkPh)&1;
  E(cx,40,5.5,2.5,O);E(cx+6*dir,37,3,2.6,O);P(cx+6*dir-2,34,O);P(cx+6*dir+2,34,O);
  LN(cx-5*dir,39,cx-8*dir,35,O);
  [-4,-2,2,4].forEach((o,i)=>R(cx+o,43,1,3-((i&1)^ph),O));ST();
  put(cx+6*dir-1,37,DK);put(cx+6*dir+1,37,DK);put(cx+6*dir,38,0xff9fb0);
  put(cx-2,38,SR);put(cx,38,SR);put(cx+2,38,SR);
  catHead=[cx+6*dir,33];
}
function catDance(cx,ghost){
  const bob=pulse>.5?-1:0,arm=Math.floor(beat)&1;
  E(cx,39+bob,3,4.6,O);E(cx,31.5+bob,3.2,2.7,O);P(cx-2,28+bob,O);P(cx+2,28+bob,O);
  LN(cx-3,36+bob,cx-6,(arm?32:38)+bob,O);LN(cx+3,36+bob,cx+6,(arm?38:32)+bob,O);
  R(cx-2,43,1,3-(arm?1:0),O);R(cx+1,43,1,3-(arm?0:1),O);LN(cx+3,42,cx+6,40+(arm?-1:1),O);
  if(ghost){ST({flat:ghost,dith:true,em:1,ol:null});return}
  R(cx-1,37+bob,2,4,CR);ST();
  fill(cx-3,31+bob,3,2,0x16121f);fill(cx+1,31+bob,3,2,0x16121f);put(cx,31+bob,0x16121f);put(cx-2,31+bob,0x8fd6ff);put(cx+2,31+bob,0x8fd6ff);
  put(cx,33+bob,0xff9fb0);catHead=[cx,27+bob];
}
function drawCat(){
  const moving=Math.abs(catX-catTgt)>.7,cx=Math.round(catX);
  if(moving||catSt===3){catWalk(cx,catDir);return}
  if(catSt===4){
    const sw=Math.sin(beat*Math.PI/2),dn=Math.cos(beat*Math.PI/2)>0?1:-1,x=106+Math.round(2.6*sw);
    catDance(x-dn*4,0xff5fb8);catDance(x-dn*2,0xff8fd0);catDance(x,0);return}
  if(catSt===0){ // curled asleep, breathing
    const br=Math.sin(T*1.7)*.55;
    E(68,41.6-br*.4,6,2.5+br,O);E(62.4,42,2.6,2.2,O);P(61,39,O);P(64,39,O);R(65,44,8,1,SR);ST();
    put(67,40,SR);put(69,40,SR);put(71,41,SR);put(61,42,SR);put(63,42,SR);
    for(let k=0;k<3;k++){const ph=(T*.42+k/3)%1,zx=Math.round(59-ph*5+Math.sin(ph*6+k)*1.2),zy=Math.round(36-ph*13),c=mixc(0xe6eaff,0x8a92d6,ph);
      if(ph>.05){put(zx,zy,c,1);put(zx+1,zy,c,1);if(ph>.3){put(zx+2,zy,c,1);put(zx+1,zy+1,c,1);put(zx,zy+2,c,1);put(zx+1,zy+2,c,1);put(zx+2,zy+2,c,1)}else{put(zx,zy+1,c,1);put(zx+1,zy+1,c,1)}}}
    catHead=[62,36];return}
  if(catSt===1){ // awake, head up, blinking
    E(69,42,6,2.5,O);E(62,38.5,3,2.6,O);P(60,35,O);P(64,35,O);R(62,41,3,2,CR);LN(75,42,77,40+Math.round(Math.sin(T*2.2)),O);ST();
    const bl=(T%3.1)<.14;put(61,38,bl?SR:DK);put(63,38,bl?SR:DK);put(62,39,0xff9fb0);put(68,40,SR);put(70,40,SR);put(72,41,SR);
    catHead=[62,34];return}
  // sitting
  E(68,40.4,3.4,4,O);E(66.5,34.5,3,2.6,O);P(65,31,O);P(68,31,O);R(66,38,2,5,CR);LN(71,44,74,43,O);P(75,42+Math.round(Math.sin(T*2)*.6),O);ST();
  const bl=(T%3.4)<.14;put(65,34,bl?SR:DK);put(67,34,bl?SR:DK);put(66,35,0xff9fb0);put(70,39,SR);put(70,41,SR);
  catHead=[66,30];
}

function drawRoom(){
  // walls, wainscot, floor
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){let c;
    if(y<27){const u=(x+y)&7,v=(x-y+64)&7;c=(u===0||v===0)?0xe2b950:(u===4&&v===4)?0xfdeeb0:0xf3d77e}
    else if(y===27)c=0x62c4bb;else if(y===28)c=0x257a76;
    else if(y<37)c=(x%8===3)?0x237772:(x%8===4)?0x3ba59d:0x2f8f8a;
    else if(y===37)c=0x1d5a58;
    else{const r=(y-38)>>2,o=r*13,seam=((y-38)&3)===0||(x+o)%24===0;c=seam?0x8a552b:(r&1?0xc07f45:0xb47339);if(!seam&&((y-38)&3)===1)c=mixc(c,0xffffff,.13)}
    A[y*W+x]=pk(c);EM[y*W+x]=0}
  // rug
  for(let x=84;x<130;x++){const k=((x-84)>>2)%3;R(x,42,1,6,k===0?0xef7a63:k===1?0xf7ead0:0x3aa69f)}ST();
  // window
  R(48,6,41,20,0xf7ead0);ST();sky();
  fill(68,8,1,16,0xf7ead0);fill(50,15,37,1,0xf7ead0);fill(50,16,37,1,0xd8c9ae);
  R(46,26,45,1,0xf7ead0);ST();
  R(43,4,51,1,0xd9a441);ST();
  for(let y=5;y<27;y++){const w=(y>15&&y<19)?4:6;for(let i=0;i<w;i++){R(45+i,y,1,1,(i&1)?0xd24d6c:0xe8607a);R(91-i,y,1,1,(i&1)?0xd24d6c:0xe8607a)}}ST();
  // shelf: books above, jelly jars below
  R(22,15,23,1,0xa8683a);R(22,24,23,1,0xa8683a);ST();
  let x=23;[[2,6,0xe24a4a],[2,5,0x3aa69f],[3,6,0xf7c948],[2,4,0x6f7fe8],[2,6,0xf29a3e],[3,5,0xe8607a]].forEach(b=>{R(x,15-b[1],b[0],b[1],b[2]);ST();x+=b[0]+1});
  [0xe8558a,0x9bd65a,0xf7a23b,0x6f7fe8].forEach((c,k)=>{const jx=24+k*5;R(jx,19,4,5,c);R(jx,18,4,1,0xf7ead0);ST();put(jx+1,20,mixc(c,0xffffff,.6));put(jx+1,21,mixc(c,0xffffff,.3))});
  // floor lamp (brass, mint shade)
  R(5,40,7,2,0xd9a441);R(8,22,1,18,0xd9a441);ST();
  for(let j=0;j<7;j++){const w=5+j;R(8-(w>>1),15+j,w,1,lampOn?0xeafff3:0x9fe3c4)}ST({em:lampOn?1:0});
  // wall clock
  E(113,10,4,4,0xfbf3dd);ST();
  {const hr=2+8*p,ma=(hr%1)*6.2832,ha=(hr%12)/12*6.2832;
   for(let r=1;r<=3;r++)put(Math.round(113+Math.sin(ma)*r),Math.round(10-Math.cos(ma)*r),DK);
   for(let r=1;r<=2;r++)put(Math.round(113+Math.sin(ha)*r),Math.round(10-Math.cos(ha)*r),0xe24a4a);put(113,10,DK)}
  // cabinet + red boombox
  R(101,28,23,12,0xa8683a);R(102,40,2,2,0x8a552b);R(121,40,2,2,0x8a552b);ST();
  fill(112,30,1,9,0x80502a);put(110,34,0xf7c948);put(114,34,0xf7c948);fill(103,30,8,1,0xbb7a48);fill(114,30,8,1,0xbb7a48);
  {const th=boom&&pulse>.55?1:0,sr=1.8+(boom?pulse*1.5:0);
   R(104,19-th,19,9+th,0xe24a4a);R(108,16-th,11,1,0x3a2a3a);R(108,17-th,1,2,0x3a2a3a);R(118,17-th,1,2,0x3a2a3a);ST();
   E(108,24,sr,sr,0x33263a);E(119,24,sr,sr,0x33263a);ST({ol:null,sh:false});
   put(108,24,0xf7ead0);put(119,24,0xf7ead0);fill(112,21-th,4,2,0xf7ead0);put(113,21-th,0x33263a);put(112,25,0xffd23f);put(114,25,0x6fe7b7);put(115,25,0xf7ead0)}
  // door (x130–143) + frame
  R(128,7,18,31,0xf7ead0);ST();
  if(inA>.03){
    fill(130,9,14,29,0xf79a3e,1);fill(130,9,14,6,0xe07f2e,1);fill(130,31,14,7,0xffbd66,1);
    const lw=Math.round(lerp(14,3,sst(0,1,inA)));R(130,9,lw,29,0x3f6cc0);ST();
  }else{
    R(130+shake,9,14,29,0x4f7fd6);ST();
    fill(132+shake,12,10,9,0x3f6cc0);fill(132+shake,12,10,1,0x33589f);fill(132+shake,24,10,10,0x3f6cc0);fill(132+shake,24,10,1,0x33589f);
    put(141+shake,22,0xffe08a);put(141+shake,23,0xd9a441);
    if(waiting){ // puppy outside: warm light under the door, shifting paw shadows
      for(let i=130;i<144;i++){put(i,37,0xffc66a,1);mixPut(i,38,0xffb04a,.55,0);if((i+1)&1)mixPut(i,39,0xffb04a,.3,0)}
      [[133,1.7,0],[139,2.3,1.2]].forEach(f=>{const fx=f[0]+Math.round(Math.sin(T*f[1]+f[2])*1.6);put(fx,37,0x6b3a1a,1);put(fx+1,37,0x6b3a1a,1);mixPut(fx,38,0x5a3418,.5,0)});
    }
  }
  // framed jelly shark
  R(149,8,13,12,0xa8683a);ST();fill(151,10,9,8,0xbfe9f5);fill(151,16,9,2,0x9fd8ee);
  for(let i=152;i<=158;i++)put(i,14,0xff8fb8);for(let i=154;i<=157;i++){put(i,13,0xff8fb8);put(i,15,0xffb3cf)}
  put(155,12,0xff8fb8);put(152,13,0xff8fb8);put(152,15,0xff8fb8);put(157,13,DK);put(155,13,0xffd6e6);
  // potted plant
  {const sw=Math.sin(T*1.1)*.8+(boom?Math.sin(beat*Math.PI)*1.3:0);
   LN(166,35,164+sw,29,0x3d9950);LN(167,35,170+sw,28,0x3d9950);LN(166,35,167+sw*1.4,23,0x3d9950);
   E(163+sw,28,2,3,0x4fae5a);E(171+sw,26,2,3,0x5cc068);E(167+sw*1.4,21,2,3.4,0x4fae5a);ST();
   R(163,37,7,6,0xd9703f);R(162,36,9,2,0xe8854f);ST()}
  // pet bed, cat
  E(67,43,13,3.6,0x8a5bd6);E(67,42.4,10,2.2,0xb79af0);ST();
  drawCat();
  // puppy
  if(inA>.25){const px=Math.round(lerp(141,133,sst(.25,1,inA))),bob=pulse>.5?-1:0,wag=Math.round(Math.sin(T*14));
    E(px+1,41+bob,4,2.6,0xfdfaf3);E(px-4,36.5+bob,3,2.8,0xfdfaf3);
    R(px-2,43,1,3,0xfdfaf3);R(px,43,1,3,0xfdfaf3);R(px+3,43,1,3,0xfdfaf3);R(px+5,43,1,3,0xfdfaf3);
    LN(px+5,40+bob,px+7,37+bob+wag,0xfdfaf3);
    R(px-7,35+bob,1,4,0x8a5a3a);R(px-1,35+bob,1,4,0x8a5a3a);ST();
    put(px-5,36+bob,DK);put(px-3,36+bob,DK);put(px-4,38+bob,DK);if(bob)put(px-4,39+bob,0xff7f9a);put(px+2,40+bob,0xd9a070);put(px+3,40+bob,0xd9a070)}
  // knock: sound arcs + “!” over the cat
  let ex=false;
  for(const h of hits){const a=T-h;if(a<0||a>.42)continue;if(a<.4)ex=true;
    for(let k=0;k<2;k++){const r=4+a*30-k*4;if(r<2)continue;for(let an=-.75;an<=.75;an+=.12){const ax=Math.round(128-Math.cos(an)*r),ay=Math.round(22+Math.sin(an)*r*.9);if(ay>1&&ay<37)put(ax,ay,k?0xffd98a:0xfff6d8,1)}}}
  if(ex&&inA<.5){const hx=catHead[0],hy=catHead[1]-6;R(hx,hy,1,3,0xffd23f);R(hx,hy+4,1,1,0xffd23f);ST({em:1})}
  // music notes
  if(boom)for(let k=0;k<3;k++){const ph=(T*.45+k/3)%1;if(ph>.9)continue;const sd=k&1?1:-1,nx=Math.round((sd<0?101:124)+sd*ph*8+Math.sin(ph*9+k)*1.5),ny=Math.round(17-ph*14),c=[0xffd23f,0x7fe3ff,0xff8fc8][k];
    put(nx,ny+3,c,1);put(nx+1,ny+3,c,1);put(nx,ny+2,c,1);put(nx+1,ny+2,c,1);put(nx+1,ny+1,c,1);put(nx+1,ny,c,1);put(nx+1,ny-1,c,1);put(nx+2,ny-1,c,1);put(nx+2,ny,c,1)}
  // disco ball
  if(party>.02){const cy=Math.round(-6+sst(0,1,party)*17);for(let y=0;y<cy-4;y++)put(96,y,0x3a3048);
    E(96,cy,4,4,0xb9c6e0);ST({em:1});const sp=Math.floor(T*7);
    for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++)if(dx*dx+dy*dy<=11){const q=(dx*2+dy*3+sp)&7;if(q===0)put(96+dx,cy+dy,0xffffff,1);else if(q===3)put(96+dx,cy+dy,0x8c9ac0,1)}}
  // string of bulbs
  for(let i=0;i<W;i++)put(i,wireY(i),0x3a3048);
  for(let i=0;i<12;i++){const on=glow[i],c=BC[i%5];R(BX[i],BY[i],2,2,on?c:mixc(c,0x4a4460,.62));P(BX[i],BY[i]+2,on?c:mixc(c,0x4a4460,.62));ST({em:on?1:0});if(on)put(BX[i],BY[i],0xffffff,1)}
  // confetti glints
  if(party>.3)for(let k=0;k<22;k++){const cx=(k*37+11)%176,cy=((T*(9+(k%5)*3)+k*13)%58)-4;if(Math.sin(T*7+k*1.7)>-.1)put(cx,cy,[0xff6b6b,0xffd23f,0x6fe7b7,0x6fa8ff,0xff8fc8,0xffffff][k%6],1)}
}

// lighting: display half (dawn dragged by the knob) + fully lit half (seen through the glass)
function lightRoom(){
  const nd=sst(.16,.44,p),wt=sst(.3,.75,p),tg=lerp(.88,1,wt),tb=lerp(.8,1,wt);
  const moon=1-nd,sun=sst(.42,.7,p)*(1-.6*party),band=1-sst(.88,1,p);
  const sp=[];if(party>.05)for(let k=0;k<4;k++)sp.push(88+74*Math.sin(T*.7+k*1.6),30+13*Math.sin(T*.9+k*2.1),BCR[(k+1)%5]);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const i=y*W+x,c=A[i],e=EM[i],bay=BAY[(y&3)*4+(x&3)];let r=c&255,g=c>>8&255,b=c>>16&255,ar=0,ag=0,ab=0;
    if(lampA>.01){const dx=x-8,dy=(y-27)*.8,d=Math.sqrt(dx*dx+dy*dy),I=(d<9?.56:d<15?.36:d<21?.2:d<27?.08:0)*lampA;ar=I*120;ag=I*78;ab=I*8}
    if(y<13)for(let j=0;j<12;j++)if(glow[j]){const dx=x-BX[j]-.5,dy=y-BY[j]-1,d2=dx*dx+dy*dy;if(d2<72&&!e){const f=1-Math.sqrt(d2)/8.5;if(f*1.2>bay+.12){const q=BCR[j%5];r+=(q[0]-r)*.4;g+=(q[1]-g)*.4;b+=(q[2]-b)*.4}}}
    for(let k=0;k<sp.length;k+=3){const dx=x-sp[k],dy=(y-sp[k+1])*1.25,d2=dx*dx+dy*dy;if(d2<64&&bay<.62*party){const q=sp[k+2];r+=(q[0]-r)*.38;g+=(q[1]-g)*.38;b+=(q[2]-b)*.38}}
    const sx=x+(y-24)*.9,shaft=y>=26&&sx>=50&&sx<87&&!e;
    let lr=r+ar*.35,lg=g+ag*.35,lb=b+ab*.35;
    if(shaft&&bay<sun*.8){lr+=36;lg+=24;lb+=2}
    let nr,ng,nb;
    if(e){nr=r;ng=g;nb=b}else{nr=r*.3+7;ng=g*.34+9;nb=b*.56+30;if(shaft&&bay<moon*.82){nr+=15;ng+=25;nb+=42}}
    nr+=ar;ng+=ag;nb+=ab;
    let dr,dg,db;
    if((bxn-x)/9+.5>bay){dr=lr;dg=lg*tg;db=lb*tb;const w=1-(bxn-x)/26;if(w>0&&w*band>bay){dr+=30;dg+=8;db-=16}}
    else{dr=nr;dg=ng;db=nb}
    const o=i*4,o2=o+W*H*4;
    OUTC[o]=dr;OUTC[o+1]=dg;OUTC[o+2]=db;OUTC[o+3]=255;OUTC[o2]=lr;OUTC[o2+1]=lg;OUTC[o2+2]=lb;OUTC[o2+3]=255}
}

// ───────────────────────── audio (all synthesised)
const BPM=100,SPB=60/BPM,S16=SPB/4;
const CHD=[[53,57,60,64],[57,60,64,67],[57,60,62,65],[58,62,65,69]],RT=[41,45,38,34];
const MEL={};[[0,72,3],[4,69,2],[6,72,2],[8,76,4],[12,74,2],[14,72,2],[16,76,3],[20,79,2],[22,76,2],[24,72,4],[28,69,3],[32,77,3],[36,76,2],[38,74,2],[40,69,4],[44,72,2],[46,74,2],[48,74,3],[52,77,2],[54,81,2],[56,79,3],[59,77,2],[61,72,3]].forEach(m=>MEL[m[0]]=m);
const PENT=[65,67,69,72,74,77,79,81,84,86,89,91];
const mtof=n=>440*Math.pow(2,(n-69)/12);
let ac=null,master,musBus,lpf,pump,duck,ambBus,mbBus,padBus,tuneBus,sfxBus,knockIn,NB,rubG,rubF,tuneO,tuneG,crk=[],songT0=0,nextT=0,step=0,soundOn=false,userMuted=false;
const lev=[1,0,0,0,0];
const live=()=>ac&&soundOn&&ac.state==='running';
const gn=(dest,v)=>{const g=ac.createGain();g.gain.value=v;g.connect(dest);return g};
const flt=(type,f,q,dest)=>{const b=ac.createBiquadFilter();b.type=type;b.frequency.value=f;b.Q.value=q;b.connect(dest);return b};
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
  lpf=flt('lowpass',900,.5,pump);musBus=gn(lpf,1);ambBus=gn(duck,0);
  sfxBus=gn(comp,.9); // ≈5 dB over the music bus
  NB=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate);{const d=NB.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}
  // short room reverb for the music box
  const n=Math.floor(ac.sampleRate*.75),ir=ac.createBuffer(2,n,ac.sampleRate);
  for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,3.2)}
  const cvn=ac.createConvolver();cvn.buffer=ir;cvn.connect(gn(musBus,.4));
  mbBus=gn(musBus,1);mbBus.connect(cvn);
  padBus=gn(musBus,0);tuneBus=gn(musBus,0);
  // square-wave tune voice with vibrato
  tuneG=gn(flt('lowpass',2300,.6,tuneBus),0);tuneO=ac.createOscillator();tuneO.type='square';tuneO.frequency.value=523;tuneO.connect(tuneG);tuneO.start();
  {const l=ac.createOscillator();l.frequency.value=5.6;const lg=ac.createGain();lg.gain.value=4.5;l.connect(lg);lg.connect(tuneO.frequency);l.start()}
  // door knock chain: soft saturation → pan toward the door → straight to master
  const sh=ac.createWaveShaper(),cu=new Float32Array(1024);for(let i=0;i<1024;i++)cu[i]=Math.tanh((i/511.5-1)*2);sh.curve=cu;
  const kOut=gn(master,.95);
  if(ac.createStereoPanner){const pn=ac.createStereoPanner();pn.pan.value=.55;pn.connect(kOut);sh.connect(pn)}else sh.connect(kOut);
  knockIn=gn(sh,1);
  // crickets: AM-chirped sine trains
  for(let k=0;k<3;k++){const o=ac.createOscillator();o.frequency.value=4150+k*370;const g=ac.createGain();g.gain.value=0;o.connect(g);
    if(ac.createStereoPanner){const pn=ac.createStereoPanner();pn.pan.value=[-.6,.5,0][k];g.connect(pn);pn.connect(ambBus)}else g.connect(ambBus);
    o.start();crk.push({g,next:ac.currentTime+.3+k*.37,v:[.05,.04,.03][k]})}
  // wind
  {const wg=gn(ambBus,.11),wf=flt('lowpass',420,.8,wg),s=ac.createBufferSource();s.buffer=NB;s.loop=true;s.connect(wf);s.start();
   const l=ac.createOscillator();l.frequency.value=.13;const lg=ac.createGain();lg.gain.value=.06;l.connect(lg);lg.connect(wg.gain);
   const lf=ac.createGain();lf.gain.value=160;l.connect(lf);lf.connect(wf.frequency);l.start()}
  // drag rub
  rubG=gn(sfxBus,0);rubF=flt('bandpass',600,1.3,rubG);{const s=ac.createBufferSource();s.buffer=NB;s.loop=true;s.connect(rubF);s.start()}
  songT0=ac.currentTime+.08;nextT=songT0;step=0;
  setInterval(sched,25);
  return true;
}
// instruments
function mbox(t,n,v){const f=mtof(n+12);tone('sine',f,t,.003,v,.95,mbBus);tone('sine',f*2.76,t,.002,v*.28,.28,mbBus);tone('sine',f*5.4,t,.002,v*.12,.1,mbBus)}
function kick(t,v){const g=gn(musBus,0);env(g,t,.002,v,.27);const o=osc('sine',150,t,.35,g);o.frequency.exponentialRampToValueAtTime(48,t+.11)}
function snare(t,v){const g=gn(musBus,0);env(g,t,.001,v,.16);noise(t,.22,flt('bandpass',1900,.7,g));const o=tone('triangle',195,t,.001,v*.8,.1,musBus);o.frequency.exponentialRampToValueAtTime(150,t+.08)}
function hat(t,v,d){const g=gn(musBus,0);env(g,t,.001,v,d);noise(t,d+.05,flt('highpass',7200,.7,g))}
function clap(t,v){const f=flt('bandpass',1250,1.1,musBus);for(let k=0;k<3;k++){const g=gn(f,0);env(g,t+k*.011,.001,v*(k===2?1:.6),k===2?.16:.012);noise(t+k*.011,.2,g)}}
function bass(t,n,v,d){const f=mtof(n),g=gn(flt('lowpass',420,.7,musBus),0);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.012);g.gain.setValueAtTime(v*.8,t+d*.7);g.gain.linearRampToValueAtTime(0,t+d);osc('sine',f,t,d+.02,g);const g2=gn(g,.35);osc('triangle',f*2,t,d+.02,g2)}
function sub(t,n,v,d){const f=mtof(n),g=gn(musBus,0);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.01);g.gain.linearRampToValueAtTime(0,t+d);osc('sine',f,t,d+.02,g);osc('sine',f*2,t,d+.02,gn(g,.3))}
function pad(t,ch){const d=S16*16,g=gn(flt('lowpass',1150,.5,padBus),0);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(1,t+.4);g.gain.setValueAtTime(1,t+d-.1);g.gain.linearRampToValueAtTime(0,t+d+.5);
  ch.forEach(n=>{[-7,7].forEach(dt=>{const o=osc('sawtooth',mtof(n),t,d+.55,gn(g,.022));o.detune.value=dt})})}
function tune(t,n,len){const d=len*S16*.92,g=tuneG.gain;tuneO.frequency.setValueAtTime(mtof(n),t);g.setValueAtTime(0,t);g.linearRampToValueAtTime(.07,t+.015);g.linearRampToValueAtTime(.045,t+d-.03);g.linearRampToValueAtTime(0,t+d)}
function playStep(s,t){
  const bar=s>>4,st=s&15,ch=CHD[bar],L1=lev[1],L2=lev[2],L4=lev[4],lo=L2*(1-L4);
  if(L1>.01&&!(st&1)){const k=st>>1;mbox(t,ch[[0,1,2,3,2,1,2,3][k]]+(bar===3&&k>5?12:0),L1*(k&1?.1:.15));if(st===0)mbox(t,ch[0]-12,L1*.1)}
  if(lo>.01){if(st===0||st===10||(st===7&&(bar&1)))kick(t,lo*.8);if(st===4||st===12)snare(t,lo*.32);if(!(st&1))hat(t,lo*(st%4===2?.16:.09),.04);else if(st%4===3)hat(t,lo*.05,.03);
    if(st===0)bass(t,RT[bar],lo*.42,S16*5);if(st===6)bass(t,RT[bar],lo*.32,S16*2);if(st===10)bass(t,RT[bar]+7,lo*.36,S16*3);if(st===14&&bar===3)bass(t,RT[bar]+12,lo*.3,S16*2)}
  if(st===0)pad(t,ch);
  const m=MEL[s];if(m)tune(t,m[1],m[2]);
  if(L4>.01){
    if(st%4===0){kick(t,L4*.95);pump.gain.setValueAtTime(1-.55*L4,t);pump.gain.linearRampToValueAtTime(1,t+.27)}
    if(st===4||st===12)clap(t,L4*.38);
    if(st%4===2)hat(t,L4*.2,.2);else if(st&1)hat(t,L4*.07,.03);
    if(st%4===2)sub(t,RT[bar]+12,L4*.5,S16*1.7);if(st%4===3)sub(t,RT[bar]+12,L4*.38,S16*.9)}
}
function sched(){
  if(!ac||ac.state!=='running')return;const now=ac.currentTime;
  if(nextT<now-.3){const k=Math.ceil((now-nextT)/S16);nextT+=k*S16;step=(step+k)%64}
  while(nextT<now+.12){playStep(step,nextT+((step&1)?S16*.13:0));nextT+=S16;step=(step+1)%64}
  for(const c of crk){if(c.next<now)c.next=now+.05;while(c.next<now+.2){const n=3+((Math.random()*2)|0);
    for(let j=0;j<n;j++){const tt=c.next+j*.043;c.g.gain.setValueAtTime(0,tt);c.g.gain.linearRampToValueAtTime(c.v,tt+.008);c.g.gain.linearRampToValueAtTime(0,tt+.03)}
    c.next+=.5+Math.random()*.55+(Math.random()<.15?1.2:0)}}
}
const beatNow=()=>ac&&ac.state==='running'?Math.max(0,(ac.currentTime-songT0)/SPB):T/SPB;
// switch sounds
const sfx={
  grab(){if(!live())return;const t=ac.currentTime;[[2093,.15,.5],[5777,.06,.22],[11302,.025,.1]].forEach(q=>tone('sine',q[0],t,.002,q[1],q[2],sfxBus));
    const o=tone('sine',190,t,.006,.3,.11,sfxBus);o.frequency.exponentialRampToValueAtTime(440,t+.075)},
  release(){if(!live())return;const t=ac.currentTime,o=tone('sine',430,t,.004,.32,.13,sfxBus);o.frequency.exponentialRampToValueAtTime(150,t+.1)},
  pluck(i,on){if(!live())return;const t=ac.currentTime,f=mtof(PENT[i])*(on?1:.5);tone('triangle',f,t,.002,on?.2:.07,on?.42:.5,sfxBus);if(on)tone('sine',f*2,t,.002,.07,.16,sfxBus)},
  lamp(){if(!live())return;const t=ac.currentTime;[0,.075].forEach(d=>{const g=gn(sfxBus,0);env(g,t+d,.001,.34,.012);noise(t+d,.04,flt('highpass',2600,.7,g));tone('sine',150,t+d,.001,.18,.04,sfxBus)})},
  mrrp(){if(!live())return;const t=ac.currentTime,tr=gn(sfxBus,.62),g=gn(tr,0),o=ac.createOscillator(),l=ac.createOscillator(),lg=ac.createGain();
    o.type='sawtooth';o.frequency.setValueAtTime(300,t);o.frequency.linearRampToValueAtTime(545,t+.22);o.frequency.linearRampToValueAtTime(470,t+.36);
    o.connect(flt('bandpass',900,4,g));o.connect(flt('bandpass',2100,5,g));
    g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.55,t+.04);g.gain.setValueAtTime(.55,t+.25);g.gain.linearRampToValueAtTime(.0001,t+.38);
    l.frequency.value=27;lg.gain.value=.36;l.connect(lg);lg.connect(tr.gain);o.start(t);l.start(t);o.stop(t+.42);l.stop(t+.42)},
  riser(){if(!live())return;const t=ac.currentTime,g=gn(sfxBus,0),f=flt('bandpass',300,3,g);f.frequency.setValueAtTime(300,t);f.frequency.exponentialRampToValueAtTime(7000,t+.5);
    g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.4,t+.48);g.gain.linearRampToValueAtTime(.0001,t+.54);noise(t,.6,f);
    const o=tone('sawtooth',180,t,.4,.07,.14,sfxBus);o.frequency.exponentialRampToValueAtTime(1400,t+.5);
    const c=gn(sfxBus,0);env(c,t+.5,.002,.42,1.3);noise(t+.5,1.5,flt('highpass',3600,.6,c))},
  brake(){if(!live())return;const t=ac.currentTime,g=gn(flt('lowpass',1300,1,sfxBus),0),o=osc('sawtooth',330,t,.7,g);o.frequency.exponentialRampToValueAtTime(32,t+.6);
    g.gain.setValueAtTime(.26,t);g.gain.linearRampToValueAtTime(.0001,t+.62);const n=gn(sfxBus,0);env(n,t,.004,.2,.3);const f=flt('bandpass',1800,2,n);f.frequency.exponentialRampToValueAtTime(260,t+.4);noise(t,.5,f)},
  yip(){if(!live())return;const t=ac.currentTime;[0,.17].forEach((d,k)=>{const g=gn(flt('bandpass',1650,1.6,sfxBus),0);env(g,t+d,.006,k?.5:.42,.1);const o=osc('sawtooth',640,t+d,.16,g);o.frequency.exponentialRampToValueAtTime(1260,t+d+.045);o.frequency.exponentialRampToValueAtTime(880,t+d+.12)})},
  knock(){if(!live())return;const t0=ac.currentTime+.01;for(let k=0;k<3;k++){const t=t0+k*.25;
    let g=gn(knockIn,0),o=osc('sine',98,t,.42,g);o.frequency.exponentialRampToValueAtTime(60,t+.25);env(g,t,.004,1,.3);          // deep thud
    g=gn(knockIn,0);o=osc('sine',190,t,.2,g);o.frequency.exponentialRampToValueAtTime(128,t+.09);env(g,t,.002,.7,.13);            // fast harmonics
    g=gn(knockIn,0);osc('sine',410,t,.1,g);env(g,t,.001,.42,.05);
    g=gn(knockIn,0);env(g,t,.001,.9,.03);noise(t,.06,flt('bandpass',1900,2.2,g));                                                  // knuckle click
    duck.gain.setTargetAtTime(.45,t,.008);duck.gain.setTargetAtTime(1,t+.11,.12)}}                                                // music ducks to ~45%
};

// ───────────────────────── DOM, GL
const cv=document.getElementById('cv'),stage=document.getElementById('stage'),btn=document.getElementById('snd');
const rc=document.getElementById('rc'),rl=document.getElementById('rl'),rm=document.getElementById('rm'),root=document.documentElement;
const PADX=22,PADY=27,CWU=W+PADX*2,CHU=H+PADY*2;
const gl=cv.getContext('webgl2',{antialias:false,alpha:false,powerPreference:'high-performance'});
const VS=`#version 300 es
void main(){vec2 v=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(v*2.-1.,0.,1.);}`;
const FS=`#version 300 es
precision highp float;
uniform sampler2D uTex;uniform vec2 uRes;uniform float uS;uniform vec3 uBg;uniform float uDay;
uniform vec3 uK;uniform vec2 uSt;uniform vec3 uE;uniform vec3 uEA;
out vec4 o;
const vec2 PAD=vec2(22.,27.),RS=vec2(176.,50.);
const float KR=15.,KH=30.;
float sdRR(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
float sdBez(vec2 cp){return sdRR(cp,RS*.5+6.,28.);}
vec3 room(vec2 p,float lit){ivec2 t=ivec2(clamp(floor(p-PAD),vec2(0.),RS-1.));t.y+=int(lit)*50;return texelFetch(uTex,t,0).rgb;}
vec3 scene(vec2 p,float lit){
  vec2 cp=p-PAD-RS*.5;
  float dt=sdRR(cp,RS*.5,22.),db=sdBez(cp);
  // page + drop shadow (fades out before the canvas edge)
  float sh=1.-smoothstep(-8.,13.,sdRR(cp-vec2(0.,5.),RS*.5+4.,26.));
  vec3 c=mix(uBg,vec3(.04,.03,.10),sh*sh*mix(.6,.3,uDay));
  if(db<1.){ // moulded bezel: white gloss plastic by day, graphite by night
    float t=clamp(-db/6.,0.,1.),day=max(uDay,lit);
    vec2 n=normalize(vec2(sdBez(cp+vec2(.5,0.))-sdBez(cp-vec2(.5,0.)),sdBez(cp+vec2(0.,.5))-sdBez(cp-vec2(0.,.5)))+1e-5);
    float l=dot(n,normalize(vec2(-.3,-1.)))*cos(t*3.14159);
    vec3 bz=mix(vec3(.17,.18,.235),vec3(.945,.945,.965),day)*(1.+l*mix(.5,.11,day));
    bz+=smoothstep(.26,0.,abs(t-.3))*max(-n.y,0.)*mix(.16,.05,day);
    bz*=1.-.3*smoothstep(1.6,0.,dt);
    c=mix(c,clamp(bz,0.,1.),clamp(.5-db*uS,0.,1.));
  }
  if(dt<1.){
    vec3 r=room(p,lit);
    r*=1.-.5*smoothstep(-5.5,0.,sdRR(cp-vec2(0.,2.6),RS*.5,22.))*(1.-.55*lit); // inner shadow along the top
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
  // crescent echoes trailing the knob
  for(int i=0;i<3;i++){
    float ex=uE[i],side=sign(uK.x-ex);vec2 qe=p-vec2(ex,uK.y);
    vec2 a=vec2(qe.x,qe.y-clamp(qe.y,-8.,8.));float de=length(a)-KR;
    float ring=1.25*smoothstep(3.2,0.,abs(de+2.5))+.4*exp(-abs(de+2.5)/5.);
    c+=mix(vec3(1.,.5,.36),vec3(1.,.4,.74),float(i)*.5)*ring*clamp(-qe.x*side/KR,0.,1.)*uEA[i]*inT;
  }
  // soft shadow of the knob on the room, light gathered toward its foot
  float dsh=knob(p-vec2(2.5,4.),q,g);
  c*=1.-.36*(1.-smoothstep(-4.,7.,dsh))*mix(.3,1.,inB);
  vec2 f=(p-uK.xy-vec2(1.,KH*uSt.y-2.))/vec2(10.,3.4);
  c+=vec3(1.,.9,.68)*exp(-dot(f,f))*.32*inB;
  float d=knob(p,q,g);
  if(d<1.){
    float m=clamp(1.+d/(KR*min(uSt.x,uSt.y)),0.,1.);
    // magnify ~1.28x, bend toward the rim, split R/G/B there
    vec2 base=uK.xy+(p-uK.xy)/1.28;float bend=pow(m,2.6)*9.;
    vec3 k=vec3(scene(base+g*bend*.78,1.).r,scene(base+g*bend,1.).g,scene(base+g*bend*1.24,1.).b);
    k*=1.-.4*smoothstep(.6,.84,m)*(1.-smoothstep(.9,.99,m));                 // darker refraction band
    k=mix(k,mix(vec3(.74,.8,1.),vec3(1.,.95,.9),uDay),pow(m,3.)*.3);          // fresnel tint
    k+=smoothstep(.9,1.,m)*.5;                                                // bright edge
    k=mix(k,vec3(1.),.045);
    float hs=min(sdSeg(q,vec2(-KR*.5,-(KH-KR)*.95),vec2(-KR*.52,3.)),sdSeg(q,vec2(-KR*.5,-(KH-KR)*.95),vec2(-KR*.22,-(KH-KR)-KR*.58)));
    k+=smoothstep(2.3,.3,hs)*.5;                                             // long soft streak, upper left
    k+=smoothstep(2.,.8,length(q-vec2(KR*.42,(KH-KR)+KR*.2)))*.9;             // small dot, lower right
    c=mix(c,k,clamp(.5-d*uS,0.,1.));
  }
  o=vec4(clamp(c,0.,1.),1.);
}`;
let prog,U={},scale=1;
function fail(msg){const d=document.createElement('p');d.className='err';d.textContent=msg;stage.replaceChildren(d)}
function initGL(){
  if(!gl){fail('This study needs WebGL2, which this browser did not provide.');return false}
  const mk=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s};
  try{prog=gl.createProgram();gl.attachShader(prog,mk(gl.VERTEX_SHADER,VS));gl.attachShader(prog,mk(gl.FRAGMENT_SHADER,FS));gl.linkProgram(prog);
    if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(prog))}
  catch(e){console.error(e);fail('The shader failed to compile on this device.');return false}
  gl.useProgram(prog);['uTex','uRes','uS','uBg','uDay','uK','uSt','uE','uEA'].forEach(n=>U[n]=gl.getUniformLocation(prog,n));
  gl.bindVertexArray(gl.createVertexArray());
  gl.bindTexture(gl.TEXTURE_2D,gl.createTexture());
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,W,H*2,0,gl.RGBA,gl.UNSIGNED_BYTE,OUT8);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.uniform1i(U.uTex,0);return true;
}
function resize(){
  const dpr=window.devicePixelRatio||1,w=Math.max(160,stage.clientWidth);
  scale=Math.max(1,Math.floor(w*dpr/CWU)); // whole device pixels per scene pixel, as many as fit
  if(cv.width!==CWU*scale){cv.width=CWU*scale;cv.height=CHU*scale}
  cv.style.width=(CWU*scale/dpr)+'px';cv.style.height=(CHU*scale/dpr)+'px';
}

// ───────────────────────── interaction + physics
let tp=0,kp=0,kv=0,wob=0,wv=0,drag=null,last=0,partyOn=false,entered=false,awake=false,kt=.6;
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

const BGS=[[0,27,26,56],[.35,44,38,80],[.6,112,100,150],[.8,205,199,222],[1,233,230,240]];
let bg=[27,26,56],lastBg=-1,lastDark=null,lastClock='',lastL='',lastM='',lastVal=-1;
function ui(){
  let k=0;while(k<BGS.length-2&&p>BGS[k+1][0])k++;const a=BGS[k],b=BGS[k+1],f=clamp((p-a[0])/(b[0]-a[0]),0,1);
  bg=[1,2,3].map(i=>Math.round(lerp(a[i],b[i],f)));const key=bg[0]<<16|bg[1]<<8|bg[2];
  if(key!==lastBg){lastBg=key;root.style.setProperty('--bg',`rgb(${bg[0]},${bg[1]},${bg[2]})`)}
  const dark=p>.64;if(dark!==lastDark){lastDark=dark;const c=dark?'38,35,58':'236,232,250';
    root.style.setProperty('--fg',`rgb(${c})`);root.style.setProperty('--mut',`rgba(${c},${dark?.68:.64})`);root.style.setProperty('--line',`rgba(${c},.2)`)}
  const mins=Math.round(120+p*480),ck=String(Math.floor(mins/60)).padStart(2,'0')+':'+String(mins%60).padStart(2,'0');
  const li=p<.15?'Night':p<.38?'First light':p<.6?'Sunrise':p<.86?'Morning':'Party',mu=p<.12?'Crickets':p<.36?'Music box':p<.58?'Beat':p<.86?'Band':'Party';
  if(ck!==lastClock){lastClock=ck;rc.textContent=ck}if(li!==lastL){lastL=li;rl.textContent=li}if(mu!==lastM){lastM=mu;rm.textContent=mu}
  const v=Math.round(tp*100);if(v!==lastVal){lastVal=v;const tm=Math.round(120+tp*480);cv.setAttribute('aria-valuenow',v);
    cv.setAttribute('aria-valuetext',String(Math.floor(tm/60)).padStart(2,'0')+':'+String(tm%60).padStart(2,'0')+', '+(tp<.15?'Night':tp<.38?'First light':tp<.6?'Sunrise':tp<.86?'Morning':'Party'))}
}

function frame(now){
  requestAnimationFrame(frame);
  const t=now/1000,dt=clamp(t-last,0,.05);last=t;T+=dt;
  // spring: knob lags the finger; wobble spring fed by acceleration
  const n=4,h=dt/n;for(let i=0;i<n;i++){const acc=230*(tp-kp)-16.5*kv;kv+=acc*h;kp+=kv*h;
    if(kp<0){kp=0;if(kv<0)kv*=-.28}else if(kp>1){kp=1;if(kv>0)kv*=-.28}
    wv+=(-310*wob-9*wv-acc*.36)*h;wob+=wv*h}
  p=clamp(kp,0,1);
  const sx=1+Math.min(.3,Math.abs(kv)*.055),kxr=KX0+p*(KX1-KX0);
  beat=beatNow();pulse=Math.max(0,1-(beat%1)*2.4);
  // story events
  bxn=kxr+(p-.5)*60;
  for(let i=0;i<12;i++){const on=bxn>BX[i]+4;if(on!==lit[i]){lit[i]=on;sfx.pluck(i,on)}glow[i]=on&&!(partyOn&&((Math.floor(beat*2)+i)%4===0))}
  const lo=lampOn?p>.085:p>.1;if(lo!==lampOn){lampOn=lo;sfx.lamp()}lampA+=((lampOn?1:0)-lampA)*(1-Math.exp(-dt*18));
  const aw=awake?p>.18:p>.2;if(aw!==awake){awake=aw;if(aw)sfx.mrrp()}
  const po=partyOn?p>.84:p>=.86;if(po!==partyOn){partyOn=po;po?sfx.riser():sfx.brake()}party+=((partyOn?1:0)-party)*(1-Math.exp(-dt*4));
  const en=entered?p>.93:p>=.965;if(en!==entered){entered=en;if(en)sfx.yip()}inA+=((entered?1:0)-inA)*(1-Math.exp(-dt*5));
  waiting=p>=.8&&!entered;
  if(waiting){kt-=dt;if(kt<=0){kt=2.8;hits.push(T,T+.25,T+.5);sfx.knock()}}else kt=.7;
  while(hits.length&&T-hits[0]>.6)hits.shift();
  shake=0;for(const hh of hits){const a=T-hh;if(a>=0&&a<.07)shake=2}
  boom=p>.36;
  catSt=p<.2?0:p<.38?1:p<.55?2:p<.86?3:4;catTgt=catSt<3?67:catSt===3?lerp(74,104,sst(.55,.8,p)):106;
  {const d=catTgt-catX,s=Math.min(Math.abs(d),dt*20);if(Math.abs(d)>.01){catX+=Math.sign(d)*s;catDir=Math.sign(d);walkPh+=s*.45}}
  // echoes
  const kxc=PADX+kxr,rates=[13,7.5,4.5],ea=[0,0,0];
  for(let i=0;i<3;i++){ech[i]+=(kxc-ech[i])*(1-Math.exp(-dt*rates[i]));ea[i]=clamp(Math.abs(kxc-ech[i])/5,0,1)*(1-i*.18)}
  // audio params
  lev[0]=1-sst(.12,.42,p);lev[1]=sst(.08,.2,p)*(1-.55*sst(.86,.95,p));lev[2]=sst(.34,.44,p);lev[3]=sst(.56,.68,p);lev[4]=sst(.84,.9,p);
  if(ac){const ct=ac.currentTime;ambBus.gain.setTargetAtTime(lev[0]*.85,ct,.08);padBus.gain.setTargetAtTime(lev[3]*(1-.3*lev[4]),ct,.08);tuneBus.gain.setTargetAtTime(lev[3],ct,.08);
    lpf.frequency.setTargetAtTime(Math.min(18000,900*Math.pow(2,p*5.2)),ct,.06);
    const sp=Math.abs(kv);rubG.gain.setTargetAtTime(Math.min(.2,sp*.1),ct,.03);rubF.frequency.setTargetAtTime(500+Math.min(3200,sp*1300),ct,.03)}
  ui();
  drawRoom();lightRoom();
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
