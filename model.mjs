export const STAGES=['Идея','Сценарий','Съёмка','Монтаж','Готово','Опубликовано'];
export const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Barnaul'}).format(new Date());
export function addDays(date,n){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
export function initialState(){return {version:1,tasks:[],events:[],content:[],payments:[],notes:{},updatedAt:null};}
export function validDate(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T12:00:00Z');return !Number.isNaN(+d)&&d.toISOString().slice(0,10)===s;}
export function validateState(s){
 if(!s||s.version!==1||!['tasks','events','content','payments'].every(k=>Array.isArray(s[k])&&s[k].length<=10000)||!s.notes||typeof s.notes!=='object'||Array.isArray(s.notes))throw Error('Это не копия данных Клоди версии 1.');
 const string=(v,n=12000)=>typeof v==='string'&&v.length<=n;
 for(const key of ['tasks','events','content','payments']){const ids=new Set();for(const r of s[key]){if(!r||!string(r.id,100)||ids.has(r.id)||!string(r.title,300)||!r.title.trim()||!string(r.note))throw Error('В копии есть повреждённые записи.');ids.add(r.id);if(r.remindAt!=null&&r.remindAt!==''&&(!string(r.remindAt,80)||!/[zZ]|[+-]\d{2}:\d{2}$/.test(r.remindAt)||!Number.isFinite(Date.parse(r.remindAt))))throw Error('Проверь время напоминания.');if(r.notify!==undefined&&typeof r.notify!=='boolean')throw Error('Проверь настройку напоминания.');if(r.remindMinutes!==undefined&&(!Number.isInteger(r.remindMinutes)||r.remindMinutes<0||r.remindMinutes>43200))throw Error('Проверь срок напоминания.');
 if(key==='tasks'&&(!(r.date===''||validDate(r.date))||!['work','personal'].includes(r.category)||typeof r.done!=='boolean'||typeof r.focus!=='boolean'))throw Error('Не удалось проверить задачи.');
 if(key==='events'&&(!validDate(r.date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time)||!(r.end===''||/^([01]\d|2[0-3]):[0-5]\d$/.test(r.end)&&r.end>r.time)||!['work','personal'].includes(r.category)))throw Error('Не удалось проверить расписание.');
 if(key==='content'&&(!STAGES.includes(r.stage)||!['Reels','Карусель','Пост','Stories','Урок','Другое'].includes(r.format)||!['Instagram','Telegram','Платформа','Другое'].includes(r.channel)||!(r.date===''||validDate(r.date))||!string(r.link,2000)))throw Error('Не удалось проверить контент.');
 if(key==='content'&&[['funnel',300],['codeword',100],['destination',2000]].some(([k,n])=>r[k]!==undefined&&!string(r[k],n)))throw Error('Проверь поля воронки.');
 if(key==='content'&&r.steps!==undefined&&(!Array.isArray(r.steps)||r.steps.length>100||r.steps.some(step=>!step||!string(step.title,300)||!string(step.taskId||'',100))))throw Error('Проверь шаги воронки.');
 if(key==='content'&&r.goalType!==undefined&&(r.goalType!=='content-output'||typeof r.goalMonth!=='string'||!/^20\d{2}-(0[1-9]|1[0-2])$/.test(r.goalMonth)||['dailyReels','reelsTarget','funnelsTarget'].some(k=>!Number.isInteger(r[k])||r[k]<1||r[k]>1000)))throw Error('Проверь цель контента.');
 if(key==='content'&&r.restDays!==undefined&&(!Array.isArray(r.restDays)||r.restDays.length>366||r.restDays.some(d=>!validDate(d))))throw Error('Проверь выходные.');
 if(key==='content'&&(r.publicationMode!==undefined&&!['ordinary','trial'].includes(r.publicationMode)||r.publishedDate!==undefined&&!validDate(r.publishedDate)))throw Error('Проверь публикацию.');
 if(key==='content'&&r.weeklyRestDays!==undefined&&(!Array.isArray(r.weeklyRestDays)||r.weeklyRestDays.length>7||r.weeklyRestDays.some(d=>!Number.isInteger(d)||d<0||d>6)))throw Error('Проверь выходные недели.');
 if(key==='content'&&r.cover!==undefined&&!['none','slide','cosmic','robot','portrait'].includes(r.cover))throw Error('Не удалось проверить обложку.');
 if(key==='payments'&&(!validDate(r.date)||!['once','monthly','yearly'].includes(r.repeat)||(r.amount!==null&&(!Number.isFinite(r.amount)||r.amount<0||r.amount>1e10))||!['RUB','USD','EUR'].includes(r.currency)||!Number.isInteger(r.remind)||r.remind<0||r.remind>30||!Array.isArray(r.paid)||r.paid.length>2400||!r.paid.every(validDate)))throw Error('Не удалось проверить платежи.');
 }}
 for(const [d,note] of Object.entries(s.notes)){if(!validDate(d)||!string(note,20000))throw Error('Не удалось проверить заметки.');}
 return {version:1,tasks:s.tasks,events:s.events,content:s.content,payments:s.payments,notes:Object.fromEntries(Object.entries(s.notes)),updatedAt:typeof s.updatedAt==='string'?s.updatedAt:null};
}
export function occurrence(p,n){if(n===0)return p.date;if(p.repeat==='once')return null;const [y,m,d]=p.date.split('-').map(Number);const month=m-1+(p.repeat==='monthly'?n:n*12);const first=new Date(Date.UTC(y,month,1));const last=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();return `${first.getUTCFullYear()}-${String(first.getUTCMonth()+1).padStart(2,'0')}-${String(Math.min(d,last)).padStart(2,'0')}`;}
export function nextPayment(p){for(let n=0;n<2400;n++){const date=occurrence(p,n);if(!date)return null;if(!p.paid.includes(date))return date;}return null;}
export function paymentsInMonth(payments,month){return payments.flatMap(p=>{const out=[];for(let n=0;n<2400;n++){const date=occurrence(p,n);if(!date||date.slice(0,7)>month)break;if(date.slice(0,7)===month)out.push({...p,due:date,isPaid:p.paid.includes(date)});}return out;}).sort((a,b)=>a.due.localeCompare(b.due));}
export function safeUrl(v){try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}}
export const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
