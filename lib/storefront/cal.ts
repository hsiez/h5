export async function declineCalBooking(uid:string, reason:string) {
  const key=process.env.CAL_API_KEY;
  if (!key) throw new Error('CAL_API_KEY is not configured');
  const response=await fetch(`https://api.cal.com/v2/bookings/${encodeURIComponent(uid)}/decline`,{
    method:'POST',signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${key}`,'cal-api-version':'2026-02-25','Content-Type':'application/json'},
    body:JSON.stringify({reason})
  });
  if (!response.ok) throw new Error(`Cal decline failed with HTTP ${response.status}`);
}

// Inspect remote state on each retry: a prior response may have been lost.
export async function reconcileCalBooking(uid:string) {
  const key=process.env.CAL_API_KEY;
  if(!key)throw Error('CAL_API_KEY is not configured');
  const headers={Authorization:`Bearer ${key}`,'cal-api-version':'2026-02-25','Content-Type':'application/json'};
  const url=`https://api.cal.com/v2/bookings/${encodeURIComponent(uid)}`;
  const remote=await fetch(url,{headers,signal:AbortSignal.timeout(10000)});
  if(remote.status===404)return;
  if(!remote.ok)throw Error(`Cal lookup HTTP ${remote.status}`);
  const {data}=await remote.json();
  const status=String(data?.status||'').toLowerCase();
  if(['cancelled','canceled','rejected'].includes(status))return;
  if(!['pending','accepted'].includes(status))throw Error(`Unexpected Cal booking state: ${status}`);
  const action=status==='pending'?'decline':'cancel';
  const reason='This item request is no longer active';
  const response=await fetch(`${url}/${action}`,{method:'POST',headers,body:JSON.stringify(action==='decline'?{reason}:{cancellationReason:reason}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error(`Cal reconciliation HTTP ${response.status}`);
}
