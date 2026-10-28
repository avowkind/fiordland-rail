// Availability timeline: a zoomable SVG Gantt of rail, ferry, cruise and context rows.
const DAY=864e5;
export const D=s=>{const[y,m,d]=s.split('-').map(Number);return Date.UTC(y,m-1,d)/DAY};
const fmt=n=>new Date(n*DAY).toLocaleDateString('en-NZ',{weekday:'short',day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
const WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const WDK=['sun','mon','tue','wed','thu','fri','sat'];
// Sentences that mention money are wrapped so the Show prices switch can hide them.
function priceAware(t){return (String(t).match(/[^.]+(?:\.(?!\d)|$)/g)||[]).map(x=>/NZD|USD|\$\d|% off|price|discount/i.test(x)?`<span class="price">${esc(x)}</span>`:esc(x)).join('');}
function esc(t){return String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}

export function initTimeline(data){
const SRC=data.sources;
const ROWS=data.rows.map(r=>r.items?{...r,items:r.items.map(it=>it.d?{...it,d:it.d.map(k=>WDK.indexOf(k))}:it)}:r);
const MARKERS=[
  {d:D('2026-10-27'),l:'Today'},
  {d:D('2026-10-30'),l:'Heritage 20% offer closes'}
];

const DOM={s:D('2026-10-01'),e:D('2028-07-01')};
const PRESETS={full:[DOM.s,DOM.e],winter:[D('2027-04-20'),D('2027-09-30')],spring:[D('2027-08-25'),D('2027-11-30')],sept:[D('2027-08-15'),D('2027-10-15')],autumn:[D('2028-01-20'),D('2028-05-20')]};
let view={s:DOM.s,e:DOM.e};
let selected=null;
const svg=document.getElementById('chart');
const board=document.getElementById('board');
const detail=document.getElementById('detail');

const AX=44, ROW=30, GRP=26;
let layout={G:200,W:800};

function clampView(s,e){
  let span=Math.max(8,Math.min(e-s,DOM.e-DOM.s));
  if(s<DOM.s)s=DOM.s; if(s+span>DOM.e)s=DOM.e-span;
  return {s,e:s+span};
}

function render(){
  const W=board.clientWidth||800;
  const G=W<560?118:210;
  const CW=W-G;
  layout={G,W,CW};
  const ppd=CW/(view.e-view.s);
  const X=n=>G+(n-view.s)*ppd;
  let y=AX; const rowsY=[];
  ROWS.forEach(r=>{rowsY.push(y); y+= r.g?GRP:ROW;});
  const H=y+8;
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  svg.setAttribute('height',H);
  let o='';
  const cols=['rail','ferry','heritage','jewel','realnz','context','window','muted'];
  o+='<defs>';
  cols.forEach(c=>{o+=`<pattern id="h-${c}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" style="stroke:var(--${c})" stroke-width="2.2" stroke-opacity=".55"/></pattern>`});
  o+=`<clipPath id="cl"><rect x="${G}" y="0" width="${CW}" height="${H}"/></clipPath></defs>`;
  // row stripes + group headers (full width)
  ROWS.forEach((r,i)=>{
    const ry=rowsY[i];
    if(r.g){o+=`<rect x="0" y="${ry}" width="${W}" height="${GRP}" style="fill:var(--bg)"/>`;}
  });
  o+=`<g clip-path="url(#cl)">`;
  // weekend shading + day grid when zoomed
  const d0=Math.floor(view.s), d1=Math.ceil(view.e);
  if(ppd>=7){
    for(let n=d0;n<=d1;n++){const wd=new Date(n*DAY).getUTCDay(); if(wd===0||wd===6){o+=`<rect x="${X(n)}" y="${AX}" width="${ppd}" height="${H-AX}" style="fill:var(--weekend)"/>`;}}
  }
  // month grid
  let md=new Date(view.s*DAY); md=new Date(Date.UTC(md.getUTCFullYear(),md.getUTCMonth(),1));
  const months=[];
  while(md.getTime()/DAY<=view.e){months.push(md.getTime()/DAY); md=new Date(Date.UTC(md.getUTCFullYear(),md.getUTCMonth()+1,1));}
  months.forEach(m=>{o+=`<line x1="${X(m)}" y1="${AX-18}" x2="${X(m)}" y2="${H}" style="stroke:var(--grid)" stroke-width="1"/>`;});
  // bars
  ROWS.forEach((r,ri)=>{
    if(r.g||!r.items)return;
    const ry=rowsY[ri], by=ry+5, bh=ROW-10;
    r.items.forEach((it,ii)=>{
      const s=D(it.s), e=D(it.e)+1;
      if(e<view.s||s>view.e)return;
      const x1=X(s), x2=X(e), w=Math.max(2,x2-x1);
      const sel=selected&&selected[0]===ri&&selected[1]===ii;
      const c=`var(--${r.c})`;
      o+=`<g data-i="${ri}:${ii}" style="cursor:pointer">`;
      if(it.k==='off'){
        o+=`<rect x="${x1}" y="${by}" width="${w}" height="${bh}" fill="transparent"/>`;
        o+=`<line x1="${x1}" y1="${ry+ROW/2}" x2="${x2}" y2="${ry+ROW/2}" style="stroke:var(--muted)" stroke-dasharray="4 4" stroke-width="1.5"/>`;
      } else if(it.d && ppd>=9){
        o+=`<rect x="${x1}" y="${by}" width="${w}" height="${bh}" fill="transparent"/>`;
        const a=Math.max(s,d0), b=Math.min(e-1,d1);
        for(let n=a;n<=b;n++){
          const wd=new Date(n*DAY).getUTCDay();
          if(it.d.indexOf(wd)<0)continue;
          const fill=it.k==='confirmed'?`style="fill:${c}"`:`fill="url(#h-${r.c})" style="stroke:${c}"`;
          o+=`<rect x="${X(n)+1}" y="${by}" width="${Math.max(1,ppd-2)}" height="${bh}" rx="2" ${fill}/>`;
        }
      } else {
        let st;
        if(it.k==='confirmed') st=`style="fill:${c}"`;
        else if(it.k==='projected') st=`fill="url(#h-${r.c})" style="stroke:${c}" stroke-width="1.2"`;
        else if(it.k==='uncertain') st=`fill="url(#h-window)" style="stroke:var(--window)" stroke-dasharray="3 2" stroke-width="1.4"`;
        else st=`style="fill:var(--muted)" fill-opacity=".28"`;
        o+=`<rect x="${x1}" y="${by}" width="${w}" height="${bh}" rx="3" ${st}/>`;
      }
      if(sel){o+=`<rect x="${x1-2}" y="${by-3}" width="${w+4}" height="${bh+6}" rx="4" fill="none" style="stroke:var(--fg)" stroke-width="2"/>`;}
      // label
      const visL=Math.max(x1,G)+6, visR=Math.min(x2,W)-4;
      const lab=it.l||'';
      const need=lab.length*5.7+4;
      const showLabel = visR-visL>need && !(it.d && ppd>=9);
      if(showLabel){
        let fillC;
        if(it.k==='confirmed') fillC='var(--on)';
        else if(it.k==='dropped'||it.k==='off') fillC='var(--muted)';
        else fillC='var(--fg)';
        const deco=it.k==='dropped'?' text-decoration="line-through"':'';
        const halo=(it.k==='projected'||it.k==='uncertain')?` paint-order="stroke" style="fill:${fillC};stroke:var(--surface)" stroke-width="3"`:` style="fill:${fillC}"`;
        o+=`<text class="bl" x="${visL}" y="${ry+ROW/2+4.5}"${halo}${deco}>${esc(lab)}</text>`;
      }
      o+='</g>';
    });
  });
  // markers
  MARKERS.forEach((m,mi)=>{
    if(m.d<view.s||m.d>view.e)return;
    const mx=X(m.d+0.5);
    o+=`<line x1="${mx}" y1="${AX}" x2="${mx}" y2="${H}" style="stroke:var(--rail)" stroke-width="1.5" stroke-dasharray="${mi?'2 3':'0'}"/>`;
    if(ppd>=4||mi===0) o+=`<text class="ax" x="${mx+4}" y="${AX+11+mi*12}" style="fill:var(--rail)">${esc(m.l)}</text>`;
  });
  o+='</g>';
  // axis background
  o+=`<rect x="0" y="0" width="${W}" height="${AX}" style="fill:var(--surface)"/>`;
  o+=`<line x1="0" y1="${AX}" x2="${W}" y2="${AX}" style="stroke:var(--line)"/>`;
  o+=`<g clip-path="url(#cl)">`;
  // years
  const y0=new Date(view.s*DAY).getUTCFullYear(), y1=new Date(view.e*DAY).getUTCFullYear();
  for(let yr=y0;yr<=y1;yr++){
    const ys=Math.max(D(yr+'-01-01'),view.s);
    o+=`<text class="axy" x="${X(ys)+5}" y="15">${yr}</text>`;
    const yb=D(yr+'-01-01'); if(yb>view.s) o+=`<line x1="${X(yb)}" y1="0" x2="${X(yb)}" y2="${AX}" style="stroke:var(--line)" stroke-width="1.5"/>`;
  }
  // months / days
  const MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  months.forEach(m=>{
    const dt=new Date(m*DAY); const next=Date.UTC(dt.getUTCFullYear(),dt.getUTCMonth()+1,1)/DAY;
    const wpx=(next-m)*ppd;
    const lbl= wpx>34?MN[dt.getUTCMonth()]:(wpx>12?MN[dt.getUTCMonth()][0]:'');
    if(lbl) o+=`<text class="ax" x="${Math.max(X(m),G)+4}" y="${ppd>=14?29:34}">${lbl}</text>`;
  });
  if(ppd>=14){
    for(let n=d0;n<=d1;n++){
      const dt=new Date(n*DAY); const wd=dt.getUTCDay();
      const t=ppd>=26?WD[wd].slice(0,2)+' '+dt.getUTCDate():String(dt.getUTCDate());
      o+=`<text class="ax" x="${X(n)+ppd/2}" y="${AX-4}" text-anchor="middle" style="fill:${wd===0||wd===6?'var(--fg)':'var(--muted)'}">${t}</text>`;
    }
  }
  o+='</g>';
  // label column
  o+=`<rect x="0" y="${AX}" width="${G}" height="${H-AX}" style="fill:var(--surface)"/>`;
  ROWS.forEach((r,i)=>{
    const ry=rowsY[i];
    if(r.g){o+=`<rect x="0" y="${ry}" width="${G}" height="${GRP}" style="fill:var(--bg)"/><text class="grp" x="12" y="${ry+17}">${esc(r.g)}</text>`;}
    else{
      o+=`<rect x="0" y="${ry+6}" width="3" height="${ROW-12}" style="fill:var(--${r.c})"/>`;
      if(G>150){o+=`<text class="rl" x="12" y="${ry+14}">${esc(r.label)}</text><text class="rs" x="12" y="${ry+26}">${esc(r.sub)}</text>`;}
      else{o+=`<text class="rl" x="10" y="${ry+19}">${esc(r.label.length>17?r.label.slice(0,16)+'…':r.label)}</text>`;}
      o+=`<line x1="0" y1="${ry+ROW}" x2="${W}" y2="${ry+ROW}" style="stroke:var(--grid)"/>`;
    }
  });
  o+=`<line x1="${G}" y1="0" x2="${G}" y2="${H}" style="stroke:var(--line)"/>`;
  o+=`<text class="ax" x="12" y="29">${view.e-view.s>120?'Drag · scroll to zoom':'Day view'}</text>`;
  svg.innerHTML=o;
}

function showDetail(ri,ii){
  const r=ROWS[ri], it=r.items[ii];
  selected=[ri,ii];
  const s=D(it.s), e=D(it.e);
  const status={confirmed:'Published',projected:'Projected',uncertain:'Uncertain',dropped:'Dropped',off:'No service'}[it.k];
  let dates=s===e?fmt(s):`${fmt(s)} – ${fmt(e)}`;
  if(r.cruise && it.k!=='projected') dates+=` · ${e-s} nights`;
  if(it.d && it.d.length<7) dates+=` · runs ${it.d.map(d=>WD[d]).join(', ')}`;
  const src=it.src&&SRC[it.src]?`<p class="meta">Source: <a href="${SRC[it.src].url}" target="_blank" rel="noopener">${esc(SRC[it.src].title)}</a></p>`:'';
  detail.innerHTML=`<h2>${esc(r.label)}${it.l?' · '+esc(it.l):''}<span class="pill" style="color:var(--${it.k==='confirmed'?r.c:(it.k==='uncertain'?'window':'muted')})">${status}</span></h2><p class="meta">${esc(dates)}</p><p>${priceAware(it.n||'')}</p>${src}`;
  render();
}

function zoomAt(px,f){
  const {G,CW}=layout;
  const span=view.e-view.s;
  const t=view.s+Math.min(1,Math.max(0,(px-G)/CW))*span;
  const ns=Math.max(8,Math.min(DOM.e-DOM.s,span*f));
  const r=(t-view.s)/span;
  view=clampView(t-r*ns,t-r*ns+ns);
  clearPreset(); render();
}
function pan(dx){
  const ppd=layout.CW/(view.e-view.s);
  view=clampView(view.s-dx/ppd,view.e-dx/ppd);
  render();
}
function clearPreset(){document.querySelectorAll('[data-preset]').forEach(b=>b.setAttribute('aria-pressed','false'));}
function svgX(clientX){const r=svg.getBoundingClientRect();return (clientX-r.left)*(layout.W/r.width);}

svg.addEventListener('wheel',e=>{
  e.preventDefault();
  if(Math.abs(e.deltaX)>Math.abs(e.deltaY)&&!e.ctrlKey){pan(-e.deltaX*(layout.W/svg.getBoundingClientRect().width));clearPreset();return;}
  const f=Math.exp(e.deltaY*(e.ctrlKey?0.01:0.0018));
  zoomAt(svgX(e.clientX),f);
},{passive:false});

const ptrs=new Map(); let moved=0, lastDist=0, downTarget=null;
svg.addEventListener('pointerdown',e=>{
  svg.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  moved=0; downTarget=e.target.closest('[data-i]');
  if(ptrs.size===2){const p=[...ptrs.values()];lastDist=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}
  svg.classList.add('dragging');
});
svg.addEventListener('pointermove',e=>{
  if(!ptrs.has(e.pointerId))return;
  const prev=ptrs.get(e.pointerId);
  const cur={x:e.clientX,y:e.clientY};
  ptrs.set(e.pointerId,cur);
  if(ptrs.size===1){
    const dx=cur.x-prev.x; moved+=Math.abs(dx)+Math.abs(cur.y-prev.y);
    if(Math.abs(dx)>0){pan(dx*(layout.W/svg.getBoundingClientRect().width)); if(moved>4)clearPreset();}
  } else if(ptrs.size===2){
    const p=[...ptrs.values()]; const dist=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);
    if(lastDist>0){zoomAt(svgX((p[0].x+p[1].x)/2),lastDist/dist);}
    lastDist=dist; moved+=10;
  }
});
function endPtr(e){
  if(!ptrs.has(e.pointerId))return;
  ptrs.delete(e.pointerId);
  if(ptrs.size===0){
    svg.classList.remove('dragging');
    if(moved<6&&downTarget){const [ri,ii]=downTarget.getAttribute('data-i').split(':').map(Number);showDetail(ri,ii);}
    downTarget=null;
  }
  lastDist=0;
}
svg.addEventListener('pointerup',endPtr);
svg.addEventListener('pointercancel',endPtr);

document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{
  const p=PRESETS[b.dataset.preset]; view=clampView(p[0],p[1]);
  clearPreset(); b.setAttribute('aria-pressed','true'); render();
  const season={winter:'winter27',sept:'sept27',spring:'spring27',autumn:'autumn28'}[b.dataset.preset];
  if(season) document.dispatchEvent(new CustomEvent('season-pick',{detail:season}));
}));
document.getElementById('zin').addEventListener('click',()=>zoomAt(layout.G+layout.CW/2,0.6));
document.getElementById('zout').addEventListener('click',()=>zoomAt(layout.G+layout.CW/2,1/0.6));
window.addEventListener('resize',render);
if(window.ResizeObserver) new ResizeObserver(()=>render()).observe(board);
render();
}
