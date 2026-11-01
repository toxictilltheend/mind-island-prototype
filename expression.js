/* Local-only expressive media. Files never leave the browser. */
(() => {
 'use strict';
 const C=window.MindCore,$=s=>document.querySelector(s);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const words=C.emotionWords;
 let dbPromise,notify=()=>{},getSaved=()=>[],editor={emotionWords:[],attachments:[]},recording=null;
 const urls=new Map(),pending={studio:0,editor:0},generations={studio:0,editor:0};
 const uid=()=>crypto.randomUUID?crypto.randomUUID():'media-'+Date.now()+'-'+Math.random().toString(36).slice(2);
 function open(){
  if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{if(!window.indexedDB){reject(new Error('当前浏览器不支持附件保存。'));return;}const req=indexedDB.open('mind-island-media',1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('files'))req.result.createObjectStore('files',{keyPath:'id'});};req.onsuccess=()=>{req.result.onversionchange=()=>req.result.close();resolve(req.result);};req.onerror=()=>reject(new Error('无法打开本地附件存储，请使用普通浏览器或导出已有记录。'));req.onblocked=()=>reject(new Error('附件存储被其他页面占用，请关闭旧页面再试。'));});
  return dbPromise.catch(()=>{throw new Error('附件暂时无法保存在此浏览器中，请尝试其他浏览器，文字记录仍然可用。');});
 }
 async function transact(mode,action){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('files',mode),req=action(tx.objectStore('files'));let value;req.onsuccess=()=>{value=req.result;};tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(new Error('附件保存失败，可能是浏览器存储空间不足。'));tx.onabort=()=>reject(new Error('附件操作未完成，请重试。'));});}
 async function put(blob,meta){const item={...meta,id:uid(),size:blob.size,mime:blob.type,createdAt:Date.now(),blob};await transact('readwrite',store=>store.put(item));const {blob:ignored,createdAt,...reference}=item;return reference;}
 async function get(id){return transact('readonly',store=>store.get(id));}
 async function url(id){if(urls.has(id))return urls.get(id);const promise=get(id).then(item=>{if(!item?.blob)throw new Error('附件已不在此浏览器中。');return URL.createObjectURL(item.blob);});urls.set(id,promise);promise.catch(()=>urls.delete(id));return promise;}
 async function remove(id){await transact('readwrite',store=>store.delete(id));if(urls.has(id)){urls.get(id).then(value=>URL.revokeObjectURL(value)).catch(()=>{});urls.delete(id);}}
 async function clear(){await transact('readwrite',store=>store.clear());for(const p of urls.values())p.then(value=>URL.revokeObjectURL(value)).catch(()=>{});urls.clear();}
 async function exportMedia(entries){const ids=[...new Set(entries.flatMap(e=>(e.attachments||[]).map(a=>a.id)))],media=[],missing=[];for(const id of ids){try{const item=await get(id);if(!item?.blob)throw new Error('missing');const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(item.blob);});const {blob,createdAt,...meta}=item;media.push({...meta,data});}catch{missing.push(id);}}return {media,missing};}
 function extras(context){return context==='editor'?editor:(window.IslandStudio?.getExtras()||{emotionWords:[],attachments:[]});}
 function update(context,next){if(context==='editor')editor={...editor,...next};else window.IslandStudio?.setExtras(next);syncDisabled();}
 function busy(context='studio'){return Boolean(pending[context]||(recording&&recording.context===context));}
 function syncDisabled(){window.IslandStudio?.refresh();const save=$('#entry-form [type=submit]');if(save)save.disabled=busy('editor');}
 function time(seconds){return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');}
 const icons={photo:'<rect x="3" y="5" width="18" height="15" rx="3"/><circle cx="8" cy="10" r="1.5"/><path d="m4 18 5-5 4 4 3-3 4 4"/>',mic:'<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M6 11v2a6 6 0 0 0 12 0v-2M12 19v3m-3 0h6"/>',file:'<path d="M6 3h8l4 4v14H6ZM14 3v5h4M9 12h6m-6 4h6"/>'};
 const icon=type=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+icons[type]+'</svg>';
 function html(context){
  const e=extras(context),photos=e.attachments.filter(a=>a.kind==='image'),audio=e.attachments.filter(a=>a.kind==='audio');
  const active=recording?.context===context;
  return `<div class="expression-widget" data-expression-context="${context}"><div class="expression-label">更具体一点的感受 <small>可选，最多 3 个</small></div><div class="emotion-words">${words.map(word=>`<button type="button" data-emotion-word="${word}" aria-pressed="${e.emotionWords.includes(word)}" class="${e.emotionWords.includes(word)?'selected':''}">${word}</button>`).join('')}</div><div class="expression-count">已选择 <span>${e.emotionWords.length}</span> / 3</div><details class="media-details" ${e.attachments.length||active?'open':''}><summary>用照片或声音，留下更多感受 <span>选填</span></summary><div class="media-tools"><label class="media-add" role="button" tabindex="0" for="photos-${context}">${icon('photo')}添加照片<small>${photos.length}/3</small></label><input id="photos-${context}" class="sr-only" tabindex="-1" type="file" data-media-photos accept="image/jpeg,image/png,image/webp" multiple><button type="button" class="media-add ${active?'is-recording':''}" data-media-record ${audio.length&&!active?'disabled':''}>${icon('mic')}${active?(recording.phase==='requesting'?'等待授权…':'停止录音'):'录一段声音'}</button><label class="media-file" role="button" tabindex="0" for="audio-${context}">选择已有音频</label><input id="audio-${context}" class="sr-only" tabindex="-1" type="file" data-media-audio accept="audio/*"></div><p class="media-hint">照片最多 3 张，每张原文件不超过 8 MB，在本地压缩。录音最长 60 秒；已有音频不超过 5 MB。不自动转写。</p>${active?'<div class="recording-status" role="status"><i></i><span data-record-time>正在准备录音</span><button type="button" data-record-cancel>取消</button></div>':''}<div class="draft-media">${photos.map((a,i)=>`<figure><img data-local-media="${esc(a.id)}" alt="本次记录的照片 ${i+1}"><button type="button" data-media-remove="${esc(a.id)}" aria-label="移除照片 ${i+1}">×</button><figcaption>${esc(a.name)}</figcaption></figure>`).join('')}${audio.map(a=>`<div class="draft-audio"><span>${icon('mic')}一段留给自己的声音${a.duration?' · '+time(a.duration):''}</span><audio controls preload="metadata" data-local-media="${esc(a.id)}" aria-label="回听本次记录的语音"></audio><button type="button" data-media-remove="${esc(a.id)}">移除语音</button></div>`).join('')}</div><div class="media-message" role="status"></div><p class="media-privacy">仅保存于此浏览器，不上传云端。离开记录页面会取消正在录制的内容。</p></details></div>`;
 }
 function render(context){const host=$('[data-expression-host="'+context+'"]');if(!host)return;const wasOpen=host.querySelector('details')?.open;host.querySelectorAll('audio').forEach(audio=>audio.pause());host.innerHTML=html(context);if(wasOpen&&host.querySelector('details'))host.querySelector('details').open=true;mount(host);}
 function mount(root=document){root.querySelectorAll('[data-local-media]').forEach(el=>{if(el.tagName==='IMG'){el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label','放大查看'+el.alt);}if(el.dataset.mediaLoaded)return;el.dataset.mediaLoaded='pending';url(el.dataset.localMedia).then(src=>{if(el.isConnected){el.src=src;el.dataset.mediaLoaded='true';}}).catch(()=>{if(el.isConnected){el.dataset.mediaLoaded='missing';const error=document.createElement('span');error.className='media-unavailable';error.textContent='附件不在当前浏览器中，请使用原浏览器或备份文件。';el.after(error);}});});syncDisabled();}
 function message(context,text){const host=$('[data-expression-host="'+context+'"] .media-message');if(host)host.textContent=text;notify(text);}
 async function compress(file){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('照片暂时支持 JPG、PNG 和 WebP 格式。');
  if(file.size>8*1024*1024)throw new Error('每张照片的原文件不能超过 8 MB。');
  let bitmap,sourceUrl;try{if(window.createImageBitmap)bitmap=await createImageBitmap(file);else{sourceUrl=URL.createObjectURL(file);bitmap=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=sourceUrl;});}}catch{if(sourceUrl)URL.revokeObjectURL(sourceUrl);throw new Error('无法读取这张照片，请换一张 JPG、PNG 或 WebP 照片。');}try{if(bitmap.width*bitmap.height>40000000)throw new Error('照片尺寸过大，请选择较小的照片。');const ratio=Math.min(1,1280/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('照片处理失败，请换一张试试。')),'image/jpeg',.82));}finally{bitmap.close?.();if(sourceUrl)URL.revokeObjectURL(sourceUrl);}
 }
 async function addPhotos(context,files){
  if(pending[context]){message(context,'附件正在处理中，请稍等一下。');return;}
  const generation=generations[context];pending[context]++;syncDisabled();
  try{for(const file of files){if(extras(context).attachments.filter(a=>a.kind==='image').length>=3){message(context,'一次记录最多添加 3 张照片。');break;}try{const blob=await compress(file);if(generation!==generations[context])break;const meta=await put(blob,{kind:'image',name:file.name.slice(0,100),duration:0});if(generation!==generations[context]){await remove(meta.id);break;}update(context,{attachments:[...extras(context).attachments,meta]});render(context);}catch(error){message(context,error.message||'照片读取失败，请换一张试试。');}}}finally{pending[context]--;syncDisabled();}
 }
 async function addAudio(context,file){
  if(pending[context]||recording?.context===context){message(context,'请先完成或取消当前录音与附件处理。');return;}
  if(extras(context).attachments.some(a=>a.kind==='audio')){message(context,'一次记录保留 1 段语音，请先移除已有语音。');return;}
  if(file.size>5*1024*1024){message(context,'音频文件不能超过 5 MB。');return;}
  if(!file.type.startsWith('audio/')){message(context,'请选择音频文件。');return;}
  const generation=generations[context];pending[context]++;syncDisabled();try{const meta=await put(file,{kind:'audio',name:file.name.slice(0,100),duration:0});if(generation!==generations[context]){await remove(meta.id);return;}update(context,{attachments:[...extras(context).attachments,meta]});render(context);}catch(error){message(context,error.message);}finally{pending[context]--;syncDisabled();}
 }
 function stopTracks(state){clearInterval(state.timer);state.stream?.getTracks().forEach(track=>track.stop());}
 function cancel(){document.querySelectorAll('audio').forEach(audio=>audio.pause());const state=recording;if(!state)return;recording=null;state.cancelled=true;stopTracks(state);if(state.recorder&&state.recorder.state!=='inactive')state.recorder.stop();render(state.context);syncDisabled();}
 function updateTimer(){if(!recording)return;const seconds=Math.min(60,Math.floor((performance.now()-recording.startedAt)/1000));document.querySelectorAll('[data-record-time]').forEach(el=>{el.textContent=recording.phase==='requesting'?'正在等待麦克风授权…':'正在录音 '+time(seconds)+' / 1:00';});if(recording.phase==='recording'&&seconds>=60)finishRecording();}
 async function startRecording(context){
  if(recording){if(recording.context===context&&recording.phase==='recording')finishRecording();return;}
  if(pending[context]){message(context,'附件正在处理中，请稍等一下再录音。');return;}
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){message(context,'当前浏览器不支持直接录音，可以选择已有音频，或继续写下感受。');return;}
  if(extras(context).attachments.some(a=>a.kind==='audio'))return;
  const state={context,phase:'requesting',startedAt:performance.now(),cancelled:false,generation:generations[context],chunks:[]};recording=state;render(context);syncDisabled();updateTimer();
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:true});state.stream=stream;
   if(state.cancelled||recording!==state){stopTracks(state);return;}
   const type=['audio/webm;codecs=opus','audio/mp4','audio/webm','audio/ogg'].find(type=>MediaRecorder.isTypeSupported(type));
   const recorder=type?new MediaRecorder(stream,{mimeType:type}):new MediaRecorder(stream);state.recorder=recorder;
   recorder.ondataavailable=e=>{if(e.data.size)state.chunks.push(e.data);};
   recorder.onerror=()=>{message(context,'录音中断，请重新尝试或选择已有音频。');cancel();};
   recorder.onstop=async()=>{
    stopTracks(state);if(recording===state)recording=null;
    if(state.cancelled||state.generation!==generations[context]){syncDisabled();return;}
    pending[context]++;syncDisabled();
    try{const blob=new Blob(state.chunks,{type:recorder.mimeType||'audio/webm'});if(!blob.size)throw new Error('没有录到声音，请重试。');const duration=Math.min(60,Math.max(1,Math.round((performance.now()-state.startedAt)/1000)));const meta=await put(blob,{kind:'audio',name:'我的语音记录',duration});if(state.generation!==generations[context]){await remove(meta.id);return;}update(context,{attachments:[...extras(context).attachments.filter(a=>a.kind!=='audio'),meta]});render(context);message(context,'语音已留在草稿中，可以回听后再保存记录。');}catch(error){message(context,error.message||'语音保存失败，请重试。');}finally{pending[context]--;syncDisabled();}
   };
   state.phase='recording';state.startedAt=performance.now();recorder.start(250);state.timer=setInterval(updateTimer,250);render(context);updateTimer();
  }catch(error){if(state.cancelled)return;stopTracks(state);if(recording===state)recording=null;render(context);syncDisabled();message(context,error.name==='NotAllowedError'?'麦克风未获授权。你仍可以选择已有音频或继续写字。':'无法开启麦克风，请检查设备，或选择已有音频。');}
 }
 function finishRecording(){if(recording?.phase==='recording'){recording.phase='stopping';clearInterval(recording.timer);recording.recorder.stop();stopTracks(recording);}}
 function savedUses(id){return getSaved().some(e=>(e.attachments||[]).some(a=>a.id===id));}
 async function removeDraft(context,id){update(context,{attachments:extras(context).attachments.filter(a=>a.id!==id)});render(context);const other=extras(context==='editor'?'studio':'editor');if(!savedUses(id)&&!other.attachments.some(a=>a.id===id))await remove(id).catch(()=>{});}
 async function cleanupRemoved(entry){const studio=extras('studio').attachments,editing=extras('editor').attachments;for(const a of entry.attachments||[])if(!savedUses(a.id)&&!studio.some(b=>b.id===a.id)&&!editing.some(b=>b.id===a.id))await remove(a.id).catch(()=>notify('记录已删除，部分附件无法移除，可在隐私与数据中清空本站数据。'));}
 function resetContext(context){const previous=extras(context).attachments;generations[context]++;if(recording?.context===context)cancel();if(context==='editor'){editor={emotionWords:[],attachments:[]};const host=$('[data-expression-host=editor]');if(host)host.replaceChildren();}const other=extras(context==='editor'?'studio':'editor').attachments;for(const a of previous)if(!savedUses(a.id)&&!other.some(b=>b.id===a.id))remove(a.id).catch(()=>{});const viewer=$('#photo-viewer');if(viewer&&!viewer.open)viewer.replaceChildren();}
 function view(entry){const e=C.normalizeExtras(entry);return `${e.emotionWords.length?'<div class="saved-emotions">'+e.emotionWords.map(w=>'<span>'+esc(w)+'</span>').join('')+'</div>':''}${e.attachments.length?'<div class="saved-media">'+e.attachments.map((a,i)=>a.kind==='image'?'<img loading="lazy" data-local-media="'+esc(a.id)+'" alt="这条记录的照片 '+(i+1)+'">':'<div class="saved-audio"><span>一段声音'+(a.duration?' · '+time(a.duration):'')+'</span><audio controls preload="metadata" data-local-media="'+esc(a.id)+'" aria-label="回听这条记录的语音"></audio></div>').join('')+'</div>':''}`;}
 function openPhoto(img){if(!img.src.startsWith('blob:'))return;let dialog=$('#photo-viewer');if(!dialog){dialog=document.createElement('dialog');dialog.id='photo-viewer';dialog.setAttribute('aria-label','查看照片');document.body.append(dialog);}dialog.innerHTML='<button class="icon-button" data-close aria-label="关闭照片">×</button><img alt="'+esc(img.alt)+'">';dialog.querySelector('img').src=img.src;dialog.showModal();}
 document.addEventListener('click',event=>{
  const image=event.target.closest('.saved-media img,.draft-media img');if(image){openPhoto(image);return;}
  const button=event.target.closest('button');if(!button)return;const widget=button.closest('[data-expression-context]');if(!widget)return;const context=widget.dataset.expressionContext,d=button.dataset;
  if(d.emotionWord){const selected=extras(context).emotionWords;if(!selected.includes(d.emotionWord)&&selected.length>=3){message(context,'可以先留下最贴近此刻的 3 个感受。');return;}update(context,{emotionWords:selected.includes(d.emotionWord)?selected.filter(w=>w!==d.emotionWord):[...selected,d.emotionWord]});widget.querySelectorAll('[data-emotion-word]').forEach(b=>{const active=extras(context).emotionWords.includes(b.dataset.emotionWord);b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});widget.querySelector('.expression-count span').textContent=extras(context).emotionWords.length;}
  else if(d.mediaRemove)removeDraft(context,d.mediaRemove);
  else if('mediaRecord' in d)startRecording(context);
  else if('recordCancel' in d)cancel();
 });
 document.addEventListener('change',event=>{const widget=event.target.closest('[data-expression-context]');if(!widget)return;const context=widget.dataset.expressionContext,files=Array.from(event.target.files||[]);if('mediaPhotos' in event.target.dataset&&files.length)addPhotos(context,files);else if('mediaAudio' in event.target.dataset&&files[0])addAudio(context,files[0]);if(event.target.type==='file')event.target.value='';});
 document.addEventListener('keydown',event=>{const label=event.target.closest('label[role=button]');if(label&&(event.key==='Enter'||event.key===' ')){event.preventDefault();document.getElementById(label.htmlFor)?.click();return;}if((event.key==='Enter'||event.key===' ')&&event.target.matches('img[data-local-media]')){event.preventDefault();openPhoto(event.target);}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});window.addEventListener('pagehide',()=>{cancel();for(const p of urls.values())p.then(src=>URL.revokeObjectURL(src)).catch(()=>{});urls.clear();});
 window.LocalMedia={get,remove,clear,exportMedia};
 window.Expression={words,html,mount,view,busy,cancel,resetContext,cleanupRemoved,summary(entry){const e=C.normalizeExtras(entry),parts=[...e.emotionWords];const images=e.attachments.filter(a=>a.kind==='image').length;if(images)parts.push(images+' 张照片');if(e.attachments.some(a=>a.kind==='audio'))parts.push('一段声音');return parts.join(' · ');},connect(options){notify=options.notify;getSaved=options.getSaved;},setEditor(value){resetContext('editor');editor=C.normalizeExtras(value||{});},getEditor(){return {emotionWords:editor.emotionWords,attachments:editor.attachments};},render};
})();
