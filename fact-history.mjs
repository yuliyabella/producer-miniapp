export function factDateOf(r){return r.factCancelled?r.factUndo?.launchedAt||r.factUndo?.publishedDate||r.factUndo?.date||r.date:r.launchedAt||r.publishedDate||r.date;}
export function factEntries(state,day){return state.content.filter(r=>!r.goalType&&(r.stage==='Опубликовано'||r.factCancelled)&&factDateOf(r)===day);}
export function cancelFact(r){
 if(r.factCancelled||r.stage!=='Опубликовано')throw Error('Отметка уже отменена');
 r.factUndo={stage:r.stage,date:r.date,publishedDate:r.publishedDate,launchedAt:r.launchedAt};
 r.factCancelled=true;r.stage=Array.isArray(r.steps)?r.launchPreviousStage||'Идея':'Готово';delete r.publishedDate;delete r.launchedAt;
}
export function restoreFact(r){
 if(!r.factCancelled||!r.factUndo)throw Error('Нет отменённой отметки');
 const previous=r.factUndo;for(const key of ['stage','date','publishedDate','launchedAt']){if(previous[key]===undefined)delete r[key];else r[key]=previous[key];}delete r.factCancelled;delete r.factUndo;
}
