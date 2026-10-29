/* Pure, browser-independent helpers. No records leave this device. */
(function (root) {
  'use strict';
  const moods = [
    { value: 1, name: '低落', color: '#97a7be', face: 'M15 27q9-9 18 0' },
    { value: 2, name: '有点累', color: '#b2adc3', face: 'M16 25q8-5 16 0' },
    { value: 3, name: '平静', color: '#d5ba80', face: 'M16 24h16' },
    { value: 4, name: '还不错', color: '#9fb59a', face: 'M15 22q9 10 18 0' },
    { value: 5, name: '很开心', color: '#e5ae79', face: 'M14 22q10 15 20 0Z' }
  ];
  const tags = ['学业', '工作', '社交', '家庭', '睡眠', '生活', '独处', '运动'];
  const dayKey = date => { const d = new Date(date); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  function validateEntry(entry) {
    return !!entry && Number.isInteger(entry.mood) && entry.mood >= 1 && entry.mood <= 5 &&
      typeof entry.id === 'string' && entry.id.length > 0 && typeof entry.note === 'string' && entry.note.length <= 500 &&
      Array.isArray(entry.tags) && entry.tags.length <= tags.length && entry.tags.every(t => tags.includes(t)) &&
      Number.isFinite(new Date(entry.date).getTime());
  }
  function summarize(entries, days, now = new Date()) {
    const first = new Date(now); first.setHours(0,0,0,0); first.setDate(first.getDate()-days+1);
    const last = new Date(now).getTime();
    const filtered = entries.filter(e => validateEntry(e) && new Date(e.date) >= first && new Date(e.date).getTime() <= last);
    const daily = new Map(); const counts = {};
    for (const e of filtered) { const key = dayKey(e.date); const bucket = daily.get(key) || []; bucket.push(e.mood); daily.set(key,bucket); for (const t of new Set(e.tags)) counts[t]=(counts[t]||0)+1; }
    const points = Array.from({length:days}, (_,i) => { const d = new Date(first); d.setDate(d.getDate()+i); const key=dayKey(d); const values=daily.get(key); return {key,label:`${d.getMonth()+1}/${d.getDate()}`,value:values ? values.reduce((a,b)=>a+b,0)/values.length : null}; });
    const factors=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
    const factorDetails=factors.map(([tag,count])=>{const matching=filtered.filter(e=>e.tags.includes(tag));return {tag,count,tired:matching.filter(e=>e.mood<=2).length,calm:matching.filter(e=>e.mood===3).length,pleasant:matching.filter(e=>e.mood>=4).length};});
    return {entries:filtered,points,count:filtered.length,recordedDays:daily.size,average:filtered.length?filtered.reduce((a,e)=>a+e.mood,0)/filtered.length:null,factors,factorDetails};
  }
  function recommend(entries) {
    const latest = [...entries].filter(validateEntry).sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
    if (!latest) return {type:'breath',reason:'给自己一分钟，轻轻回到当下。'};
    if (latest.tags.includes('睡眠')) return {type:'sound',reason:'你最近提到了睡眠，可以试着听一会儿舒缓声景。'};
    if (latest.mood<=2) return {type:'breath',reason:'你最近的记录有些疲惫，也许可以先停下来，留意自己的呼吸。'};
    return {type:'move',reason:'给身体一点轻松的活动，也是一种照顾自己的方式。'};
  }
  function demoEntries(now=new Date()) {
    const samples=[ [0,4,['生活','独处'],'午后留了一点时间给自己，慢慢喝完一杯茶。'],[1,3,['工作'],'事情还没有全部做完，不过我允许自己先休息。'],[2,2,['工作','睡眠'],'昨晚睡得有些晚，今天想早点收工。'],[3,4,['社交'],'和朋友聊了很久，原来有些担心可以说出来。'],[4,3,['学业'],'把一个大任务分成了几小步，开始没那么难了。'],[5,2,['工作'],'临时多了一些安排，感觉有一点累。'],[6,5,['运动','生活'],'出去散了步，路上的风让人很舒服。'] ];
    return samples.map(([offset,mood,entryTags,note],i)=>{const d=new Date(now);d.setDate(d.getDate()-offset);return{id:`demo-${i}`,date:d.toISOString(),mood,tags:entryTags,note};});
  }
  const api={moods,tags,dayKey,validateEntry,summarize,recommend,demoEntries};
  if (typeof module!=='undefined' && module.exports) module.exports=api;
  root.MindCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
