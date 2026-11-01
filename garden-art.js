/* Soft vector illustrations; existing scene coordinates and records remain compatible. */
(() => {
 const A=window.AsciiCore;
 let serial=0;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const symbols={
  tree:'<ellipse cx="50" cy="94" rx="31" ry="5" fill="#637b4d" opacity=".12"/><path d="M50 92V38" stroke="#7b7651" stroke-width="6" stroke-linecap="round"/><path d="M50 65 29 48m21 4 18-20" stroke="#7b7651" stroke-width="3" stroke-linecap="round"/><path d="M49 5C13 9 4 51 27 64c16 9 47 8 56-12C96 24 70 0 49 5Z" fill="#8f9d69"/><path d="M49 14C24 20 19 48 32 54" fill="none" stroke="#b7c28b" stroke-width="4" stroke-linecap="round"/>',
  mountain:'<path d="M3 94 38 6q7-11 15 0l44 88Z" fill="#a8b8a0"/><path d="m38 6 14 22 12 4L53 6q-8-11-15 0" fill="#edf0df"/><path d="m47 28 8 64H14" fill="#8da58c" opacity=".5"/>',
  lamp:'<ellipse cx="50" cy="95" rx="27" ry="4" fill="#637b4d" opacity=".13"/><path d="M36 92 42 28h16l6 64Z" fill="#f1e4cd"/><path d="M41 28h18V13H41Z" fill="#ebc685"/><path d="M34 13 50 3l16 10Z" fill="#b98164"/><path d="M34 30h32M36 92h30" stroke="#ac8464" stroke-width="3" stroke-linecap="round"/><circle cx="50" cy="21" r="4" fill="#fff6ce"/><path d="M48 60h7v10h-7Z" fill="#a6b6a0"/>',
  rain:'<path d="M22 52c-23-7-11-33 6-29C31-1 68-1 73 25c24-2 27 29 5 31H22Z" fill="#b5c9c7"/><path d="m27 69-7 15m31-13-7 15m31-17-7 15" stroke="#7da7ad" stroke-width="5" stroke-linecap="round"/>',
  bridge:'<path d="M4 78q46-56 92 0" fill="none" stroke="#af8860" stroke-width="13"/><path d="M5 55q45-51 90 0M5 48v38m90-38v38M26 32v31m23-39v29m24-21v31" fill="none" stroke="#c6a274" stroke-width="4" stroke-linecap="round"/>',
  star:'<path d="m50 4 12 29 31 4-23 22 7 32-27-16-28 16 8-32L7 37l31-4Z" fill="#e5bd77"/><path d="m47 20-6 21-17 3" fill="none" stroke="#f6dca1" stroke-width="4" stroke-linecap="round"/>',
  home:'<ellipse cx="50" cy="94" rx="39" ry="5" fill="#637b4d" opacity=".12"/><path d="M19 46h62v45H19Z" fill="#ebdfc7"/><path d="M8 48 49 8q2-2 4 0l40 40Z" fill="#c18c70"/><path d="M18 43 50 14l32 29" fill="none" stroke="#d7a48b" stroke-width="3" stroke-linecap="round"/><path d="M43 63h17v29H43Z" fill="#82977e"/><rect x="25" y="57" width="11" height="13" rx="2" fill="#c0ccbc"/><path d="M30 58v10" stroke="#ebe9da" stroke-width="2"/>',
  flower:'<path d="M50 92V39m0 33C18 79 21 51 49 63m2 16c29 6 34-20 2-13" fill="#99ae76" stroke="#99ae76" stroke-width="3" stroke-linecap="round"/><path d="M50 13C36-6 15 12 30 29 8 37 21 58 41 44c4 25 27 20 23-2 22 14 39-6 17-19C89 1 63-5 59 17Z" fill="#d7a28d"/><circle cx="51" cy="29" r="12" fill="#e9c78b"/>',
  boat:'<path d="M7 73h86L77 93H24Z" fill="#b58f6c"/><path d="M48 75V5" stroke="#826e53" stroke-width="3" stroke-linecap="round"/><path d="m53 10 30 55H53Z" fill="#f2e4c6"/><path d="M42 31 18 65h24Z" fill="#d2b596"/>'
 };
 function objectBody(type){return symbols[type]||symbols.tree;}
 function icon(type){return '<svg viewBox="0 0 100 100" class="garden-object-icon" aria-hidden="true">'+objectBody(type)+'</svg>';}
 function weatherIcon(mood){
  let body='';
  if(mood===5)body='<circle cx="24" cy="24" r="10" fill="#e6bf79"/><path d="M24 3v5m0 32v5M3 24h5m32 0h5M9 9l4 4m22 22 4 4M9 39l4-4m22-22 4-4" stroke="#d9ad65" stroke-width="2.4" stroke-linecap="round"/>';
  if(mood===4)body='<path d="M5 16h27c13 0 10-13 4-11M5 25h36M5 34h23c10 0 9 12 3 10" fill="none" stroke="#9aac8a" stroke-width="2.4" stroke-linecap="round"/>';
  if(mood===3)body='<path d="M7 13h31M4 22h40M9 31h31M6 39h28" stroke="#b0b9ae" stroke-width="3" stroke-linecap="round"/>';
  if(mood<=2)body='<path d="M10 31C-1 29 3 13 14 17c2-17 26-17 27 1 12 1 11 15-1 15H10Z" fill="'+(mood===1?'#adc4c6':'#c3c9be')+'"/>'+(mood===1?'<path d="m15 39-3 5m15-5-3 5m15-5-3 5" stroke="#8eafb5" stroke-width="2.5" stroke-linecap="round"/>':'');
  return '<svg viewBox="0 0 48 48" class="garden-weather-icon" aria-hidden="true">'+body+'</svg>';
 }
 function render(state={},frame=0){
  const id='garden-'+(++serial),mood=state.mood||3,f=frame%18;
  const palette=mood===1?['#e3edef','#cfdfdc','#d8e5df']:mood===5?['#faf0d9','#e6ead6','#edf0d7']:['#eef0e4','#dfe8d8','#e9ecdd'];
  const objects=state.scene?A.sanitizeScene(state.scene).objects:A.defaultObjects();
  let weather='';
  if(mood===5)weather='<circle cx="560" cy="100" r="42" fill="#eed49c" opacity=".75"/><circle cx="560" cy="100" r="58" fill="#eed49c" opacity=".12"/>';
  else if(mood===4)weather='<path d="M84 110q52-13 98 0m312 36q45-13 79 0" stroke="#c0cfb7" stroke-width="2" stroke-linecap="round" fill="none"/>';
  const cloud=(x,y,s)=>'<g transform="translate('+x+' '+y+') scale('+s+')"><path d="M0 28C-9 9 11-5 29 8 45-16 79-4 81 14 102 8 119 26 99 35H9Z" fill="#fffefa" opacity=".78"/></g>';
  weather+=cloud(105+f*.5,73,.83)+cloud(477-f*.4,51,.61);
  if(mood===1)for(let i=0;i<15;i++){const x=100+i*37,y=126+(i*29+f*5)%86;weather+='<path d="m'+x+' '+y+'-4 10" stroke="#b2cbd0" stroke-width="1.5" stroke-linecap="round" opacity=".65"/>';}
  if(mood===3)weather+='<path d="M87 176q72-13 144 0m207-37q75-13 137 0" fill="none" stroke="#d9e1d2" stroke-width="7" stroke-linecap="round" opacity=".55"/>';
  let body='<defs><linearGradient id="'+id+'-sky" x2="0" y2="1"><stop stop-color="'+palette[0]+'"/><stop offset="1" stop-color="#f4f2e8"/></linearGradient><linearGradient id="'+id+'-land" x2="0" y2="1"><stop stop-color="#c4d2a7"/><stop offset="1" stop-color="#92ae89"/></linearGradient></defs>';
  body+='<rect width="720" height="440" rx="36" fill="url(#'+id+'-sky)"/>'+weather;
  body+='<path d="M0 363Q112 310 225 352T447 352T720 350V440H0Z" fill="#d9e6e0" opacity=".85"/><path d="M0 392Q142 356 268 389T514 382T720 386V440H0Z" fill="#cedfd8" opacity=".62"/>';
  body+='<ellipse cx="365" cy="365" rx="222" ry="23" fill="#8fa89b" opacity=".12"/><path d="M111 320C115 283 190 258 277 254c135-16 296 11 321 56 22 36-63 76-206 78-128 1-256-23-281-68Z" fill="#bdc9a4"/><path d="M113 310c35-50 132-74 244-68 110-1 211 22 241 68-21 35-102 54-231 55-113-2-210-24-254-55Z" fill="url(#'+id+'-land)"/>';
  body+='<path d="m232 289 77-134q7-13 15 0l89 143Z" fill="#b5c6b5"/><path d="m310 158 15 37 21 12-22-52q-8-13-14 3Z" fill="#e2e8d7"/><path d="m324 196 28 94h-89Z" fill="#9eb5a4" opacity=".45"/><path d="m191 299 45-80q6-8 12 0l53 86Z" fill="#a8bda3"/>';
  body+='<path d="M303 302q48 11 67 38" fill="none" stroke="#e4ddbe" stroke-width="13" stroke-linecap="round" opacity=".8"/><g fill="#edf0d7" opacity=".7"><circle cx="186" cy="308" r="2"/><circle cx="466" cy="327" r="2"/><circle cx="512" cy="294" r="2"/><circle cx="242" cy="332" r="2"/></g>';
  objects.forEach(o=>{const d=A.definitions[o.type],w=Math.max(...d.art.map(s=>s.length))*10,h=d.art.length*440/29;body+='<g transform="translate('+o.x*10+' '+o.y*440/29+') scale('+w/100+' '+h/100+')">'+objectBody(o.type)+'</g>';});
  body+='<path d="M95 '+(395+f*.3)+'q23-4 42 0m391 10q29-4 53 0" stroke="#f8fbef" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/>';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 440" class="island-illustration" aria-hidden="true">'+body+'</svg>';
 }
 function postcard(entry){
  const svg=render(entry),inside=svg.slice(svg.indexOf('>')+1,svg.lastIndexOf('</svg>'));
  const text=entry.note||'这一刻，不写字也没有关系。',lines=Array.from(text).reduce((rows,ch,i)=>{if(i%30===0)rows.push('');rows.at(-1);rows[rows.length-1]+=ch;return rows;},[]);
  const height=550+lines.length*28;
  return '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="'+height+'" viewBox="0 0 720 '+height+'"><rect width="720" height="'+height+'" fill="#faf6ed"/><text x="38" y="42" font-family="sans-serif" fill="#607854" font-size="20">心屿 · '+esc(new Date(entry.date).toLocaleDateString('zh-CN'))+' · '+esc(A.weather[entry.mood-1].name)+'</text><g transform="translate(0 68)">'+inside+'</g>'+lines.map((line,i)=>'<text x="40" y="'+(540+i*28)+'" font-family="sans-serif" fill="#78806b" font-size="15">'+esc(line)+'</text>').join('')+'</svg>';
 }
 window.GardenArt={render,icon,weatherIcon,postcard};
})();
