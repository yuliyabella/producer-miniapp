export function monthlyExpenseBudget(state,month){
 const config=state.content.find(g=>g.goalType==='content-output'&&g.goalMonth===month&&g.monthlyExpenseEstimates)||state.content.filter(g=>Array.isArray(g.monthlyExpenseEstimates)).sort((a,b)=>(b.goalMonth||'').localeCompare(a.goalMonth||''))[0];
 const estimates=config?.monthlyExpenseEstimates||[],items=[],unknown=[];
 for(const p of state.payments){
  if(p.expenseScope==='personal'||p.repeat!=='monthly'||p.currency!=='RUB'||p.date.slice(0,7)>month)continue;
  if(p.amount===null){unknown.push({id:p.id,title:p.title});continue;}
  items.push({id:p.id,title:p.title,amountRub:p.amount,optional:!!p.optional,estimated:!!p.estimated});
 }
 for(const e of estimates){
  if(e.paymentId&&items.some(p=>p.id===e.paymentId))continue;
  items.push({...e,optional:!!e.optional,estimated:true});
  const at=unknown.findIndex(p=>p.id===e.paymentId);if(at>=0)unknown.splice(at,1);
 }
 const mandatory=items.filter(p=>!p.optional).reduce((s,p)=>s+p.amountRub,0),optional=items.filter(p=>p.optional).reduce((s,p)=>s+p.amountRub,0);
 return {items,unknown,mandatory:Math.round(mandatory*100)/100,optional:Math.round(optional*100)/100,total:Math.round((mandatory+optional)*100)/100};
}
