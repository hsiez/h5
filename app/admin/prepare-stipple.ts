// Procedural graphite recipe: docs/graphite-stippling.md.
// Both assets retain the same canvas, so switching between them stays aligned.
export async function prepareStipple(photo: File): Promise<File> {
  const image = await createImageBitmap(photo);
  try {
    const width = image.width, height = image.height;
    const columns = 420, rows = Math.max(1, Math.round(columns * height / width));
    const analysis = document.createElement('canvas');
    analysis.width = columns; analysis.height = rows;
    const source = analysis.getContext('2d');
    if (!source) throw new Error('Could not prepare stippling.');
    source.drawImage(image, 0, 0, columns, rows);
    const pixels = source.getImageData(0, 0, columns, rows).data;
    const luminance = new Float32Array(columns * rows), alpha = new Float32Array(columns * rows);
    const values: number[] = [];
    let state = 2166136261;
    for (let i = 0; i < luminance.length; i++) {
      luminance[i] = (pixels[i*4]*0.2126 + pixels[i*4+1]*0.7152 + pixels[i*4+2]*0.0722) / 255;
      alpha[i] = pixels[i*4+3] / 255;
      if (alpha[i] > 0.12) values.push(luminance[i]);
      state = Math.imul(state ^ pixels[i*4], 16777619) >>> 0;
    }
    values.sort((a,b) => a-b);
    const dark = values[Math.floor(values.length * 0.025)] ?? 0;
    const light = values[Math.min(values.length-1, Math.floor(values.length * 0.965))] ?? 1;
    const range = Math.max(0.04, light-dark);
    const random = () => { state = (Math.imul(state,1664525)+1013904223) >>> 0; return state/4294967296; };
    const output = document.createElement('canvas'); output.width = width; output.height = height;
    const ctx = output.getContext('2d');
    if (!ctx) throw new Error('Could not draw stippling.');
    const cellX = width/columns, cellY = height/rows;
    for (let y=0; y<rows; y++) {
      for (let x=0; x<columns; x++) {
        const i=y*columns+x;
        if (alpha[i]<0.06) continue;
        let sum=0, count=0;
        for (let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) {
          const nx=x+dx, ny=y+dy;
          if(nx<0||nx>=columns||ny<0||ny>=rows) continue;
          const n=ny*columns+nx;
          if(alpha[n]>=0.06) {sum+=luminance[n];count++;}
        }
        const enhanced=luminance[i]+(luminance[i]-sum/count)*1.35;
        const darkness=1-Math.max(0,Math.min(1,(enhanced-dark)/range));
        const expected=darkness**2.15*8.5;
        const marks=Math.floor(expected)+(random()<expected%1?1:0);
        const strength=darkness**0.68;
        for(let p=0;p<marks;p++) {
          ctx.fillStyle=`rgba(25,24,23,${Math.min(0.96,0.22+random()*0.26+strength*0.46)})`;
          ctx.beginPath();
          ctx.ellipse((x+random())*cellX,(y+random())*cellY,
            (0.07+random()*0.16+strength*0.1)*cellX,
            (0.04+random()*0.1+strength*0.06)*cellY,
            (random()-0.5)*100*Math.PI/180,0,Math.PI*2);
          ctx.fill();
        }
      }
      if(y%16===0) await new Promise<void>(resolve=>setTimeout(resolve,0));
    }
    // Clip marks to the original full-resolution transparency, including soft edges.
    ctx.globalCompositeOperation='destination-in';
    ctx.drawImage(image,0,0,width,height);
    const blob=await new Promise<Blob|null>(resolve=>output.toBlob(resolve,'image/webp',0.95));
    if(!blob) throw new Error('Could not save stippling.');
    return new File([blob],photo.name.replace(/\.[^.]+$/,'')+'-stipple.webp',{type:'image/webp'});
  } finally { image.close(); }
}
