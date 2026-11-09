'use strict';
const KEY = 'poker-matter-v1';
const names = { coinflip: 'Coinflip', tuuritin: 'Tuuritin', tuuritettiin: 'Mut tuuritettiin' };
const $ = id => document.getElementById(id);
let hands = [];
let readable = true;
const valid = h => h && typeof h.id === 'string' && Object.hasOwn(names,h.category) && ['win','loss'].includes(h.result) && typeof h.matter === 'boolean' && typeof h.note === 'string' && h.note.length <= 200 && typeof h.at === 'string' && Number.isFinite(Date.parse(h.at)) && (h.category !== 'tuuritin' || h.result === 'win') && (h.category !== 'tuuritettiin' || h.result === 'loss');
function message(text, error = false) { $('status').textContent = text; $('status').classList.toggle('error',error); }
try {
  const saved = localStorage.getItem(KEY);
  if (saved !== null) { const parsed = JSON.parse(saved); if (!Array.isArray(parsed) || !parsed.every(valid)) throw new Error('Invalid records'); hands = parsed; }
} catch { readable = false; message('Saved data could not be read. Existing data has been preserved. Restore a backup to continue.',true); }
function commit(next) {
  try { localStorage.setItem(KEY, JSON.stringify(next)); hands = next; readable = true; render(); return true; }
  catch { message('Could not save. Browser storage may be full or blocked. Download a backup before closing.',true); return false; }
}
function render() {
  $('total').textContent = hands.length;
  $('rate').textContent = hands.length ? Math.round(hands.filter(h=>h.result === 'win').length / hands.length * 100) + '%' : '—';
  $('mattered').textContent = hands.filter(h=>h.matter).length;
  $('scoreboard').replaceChildren();
  for (const [key,name] of Object.entries(names)) {
    const group = hands.filter(h=>h.category === key);
    const tr = document.createElement('tr');
    [name,group.filter(h=>h.result==='win').length,group.filter(h=>h.result==='loss').length,group.filter(h=>h.matter).length].forEach((value,i)=>{const td=document.createElement('td');td.textContent=value;if(i===1)td.className='good';if(i===2)td.className='bad';tr.append(td);});
    $('scoreboard').append(tr);
  }
  $('undo').disabled = !hands.length || !readable;
  $('export').disabled = !readable;
  $('history').replaceChildren();
  if (!hands.length) { const p=document.createElement('p');p.className='empty';p.textContent='No hands yet. Your next flip starts the story.';$('history').append(p); }
  for (const h of hands.slice(-30).reverse()) {
    const row=document.createElement('div');row.className='history-row';
    const description=document.createElement('div');const title=document.createElement('p');title.textContent=names[h.category];
    const detail=document.createElement('small');detail.textContent=new Date(h.at).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})+(h.note?' · '+h.note:'');description.append(title,detail);
    const meta=document.createElement('div');meta.className='history-meta';const result=document.createElement('span');result.className=h.result==='win'?'good':'bad';result.textContent=h.result==='win'?'Win':'Loss';const matter=document.createElement('span');matter.className='pill';matter.textContent=h.matter?'Mattered':'Small impact';meta.append(result,matter);row.append(description,meta);$('history').append(row);
  }
}
$('category').addEventListener('change',()=>{
  const category=$('category').value;
  const win=document.querySelector('[name="result"][value="win"]');
  const loss=document.querySelector('[name="result"][value="loss"]');
  win.disabled=category==='tuuritettiin';loss.disabled=category==='tuuritin';
  if(category==='tuuritin')win.checked=true;else if(category==='tuuritettiin')loss.checked=true;else {win.checked=false;loss.checked=false;}
});
$('hand-form').addEventListener('submit',event=>{
  event.preventDefault();if(!readable){message('Restore a valid backup before saving to protect existing data.',true);return;}
  const data=new FormData(event.target);
  const h={id:crypto.randomUUID(),category:$('category').value,result:data.get('result'),matter:data.get('matter')==='yes',note:$('note').value.trim(),at:new Date().toISOString()};
  if(!valid(h)){message('Choose a valid category and outcome.',true);return;}
  if(commit([...hands,h])){ $('note').value='';document.querySelectorAll('[name="matter"]').forEach(input=>input.checked=false);message('Hand saved.'); }
});
$('undo').addEventListener('click',()=>{if(hands.length && readable && commit(hands.slice(0,-1)))message('Last hand removed.');});
$('export').addEventListener('click',()=>{
  const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,hands},null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='poker-backup-'+new Date().toISOString().slice(0,10)+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message('Backup downloaded.');
});
$('restore').addEventListener('click',()=>$('restore-file').click());
$('restore-file').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;
  try {
    if(file.size>10000000)throw new Error('Too large');
    const data=JSON.parse(await file.text());
    if(data.version!==1 || !Array.isArray(data.hands) || !data.hands.every(valid) || new Set(data.hands.map(h=>h.id)).size!==data.hands.length)throw new Error('Invalid');
    if(confirm('Replace the current records with '+data.hands.length+' hands from this backup? Download a backup of your current records first if you want to keep them.')) {if(commit(data.hands))message('Backup restored.');}
  } catch {message('Could not restore this file. Choose a valid poker tracker backup.',true);}
  event.target.value='';
});
window.addEventListener('storage',event=>{if(event.key===KEY){try{const next=JSON.parse(event.newValue||'[]');if(!Array.isArray(next)||!next.every(valid))throw new Error();hands=next;readable=true;render();message('Updated from another tab.');}catch{readable=false;render();message('Data changed in another tab and could not be read. Restore a backup to continue.',true);}}});
render();
