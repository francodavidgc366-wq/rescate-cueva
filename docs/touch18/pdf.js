const {chromium}=require('/home/davidgc/.npm/_npx/705bc6b22212b352/node_modules/playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage();await p.goto('file://'+process.argv[2]);
const [t,r,bt,l]=process.argv.slice(4).map(x=>(x*4/3)+'px');
await p.pdf({path:process.argv[3],format:'A4',margin:{top:t,right:r,bottom:bt,left:l},printBackground:true});await b.close();})();
