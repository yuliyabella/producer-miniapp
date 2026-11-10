export function contentMetrics(state,day){
 const month=day.slice(0,7),g=state.content.find(r=>r.goalType==='content-output'&&r.goalMonth===month);
 if(!g)return null;
 const published=state.content.filter(r=>r.format==='Reels'&&r.stage==='Опубликовано'&&(r.publishedDate||r.date||'').startsWith(month));
 const cursor=new Date(day+'T12:00:00Z'),weekday=(cursor.getUTCDay()+6)%7;cursor.setUTCDate(cursor.getUTCDate()-weekday);const weekStart=cursor.toISOString().slice(0,10);cursor.setUTCDate(cursor.getUTCDate()+6);const weekEnd=cursor.toISOString().slice(0,10);
 const launchedWeek=state.content.filter(r=>Array.isArray(r.steps)&&r.stage==='Опубликовано'&&(r.launchedAt||r.date||'')>=weekStart&&(r.launchedAt||r.date||'')<=weekEnd).length;
 const daily=published.filter(r=>(r.publishedDate||r.date)===day),rest=(g.restDays||[]).includes(day)||(g.weeklyRestDays||[0]).includes(new Date(day+'T12:00:00Z').getUTCDay());
 const preparation=state.content.filter(r=>r.format==='Reels'&&['Сценарий','Съёмка','Монтаж','Готово'].includes(r.stage)&&(r.date||'').startsWith(month)).length+state.tasks.filter(t=>t.deliverableType==='reel'&&(t.done||t.progress==='started')&&(t.date||'').startsWith(month)).length;
 const preparingToday=state.content.some(r=>r.format==='Reels'&&['Сценарий','Съёмка','Монтаж','Готово'].includes(r.stage)&&r.date===day)||state.tasks.some(t=>t.deliverableType==='reel'&&(t.done||t.progress==='started')&&t.date===day);
 return {goal:g,launchedWeek,published:published.length,trial:published.filter(r=>r.publicationMode==='trial').length,ordinary:published.filter(r=>r.publicationMode!=='trial').length,daily:daily.length,rest,status:rest?'Выходной':daily.length>=3?'Максимум':daily.length===2?'Оптимум':daily.length===1?'Минимум':preparingToday?'Подготовка':'Публикации ещё не отмечены',preparation,launched:state.content.filter(r=>Array.isArray(r.steps)&&r.stage==='Опубликовано'&&(r.launchedAt||r.date||'').startsWith(month)).length};
}
export function workingDays(from,to,weeklyRestDays=[0],restDays=[]){let count=0;for(let d=from;d<=to;){const cursor=new Date(d+'T12:00:00Z');if(!weeklyRestDays.includes(cursor.getUTCDay())&&!restDays.includes(d))count++;cursor.setUTCDate(cursor.getUTCDate()+1);d=cursor.toISOString().slice(0,10);}return count;}
