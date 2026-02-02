const canvas=document.getElementById("chart");
const ctx=canvas.getContext("2d");
const data=[60,40,80];


function draw(percent,color,start){
const angle=(percent/100)*Math.PI*2;
ctx.beginPath();
ctx.arc(150,150,100,start,start+angle);
ctx.strokeStyle=color;
ctx.lineWidth=14;
ctx.stroke();
return start+angle;
}


let s=0;
s=draw(data[0],"#ff6f61",s);
s=draw(data[1],"#6a5acd",s);
draw(data[2],"#2ecc71",s);
