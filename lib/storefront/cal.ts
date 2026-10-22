export async function declineCalBooking(uid:string, reason:string) {
  const key=process.env.CAL_API_KEY;
  if (!key) throw new Error('CAL_API_KEY is not configured');
  const response=await fetch(`https://api.cal.com/v2/bookings/${encodeURIComponent(uid)}/decline`,{
    method:'POST',headers:{Authorization:`Bearer ${key}`,'cal-api-version':'2026-02-25','Content-Type':'application/json'},
    body:JSON.stringify({reason})
  });
  if (!response.ok) throw new Error(`Cal decline failed with HTTP ${response.status}`);
}
