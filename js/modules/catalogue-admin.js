
import {initializeApp} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {getAuth,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {getFirestore,doc,getDocFromServer,getDocsFromServer,collection,writeBatch,serverTimestamp} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
const $=id=>document.getElementById(id);
const money=n=>"GHS "+Number(n||0).toLocaleString("en-GH",{minimumFractionDigits:2,maximumFractionDigits:2});
function safeImage(value){return typeof value==="string" && (/^data:image\/(png|jpeg|webp);base64,/i.test(value)||/^https:\/\//i.test(value))?value:"";}
function node(tag,text,className){const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);if(className)e.className=className;return e;}
const app=initializeApp(window.JUFELIX_FIREBASE_CONFIG),db=getFirestore(app),auth=getAuth(app);
let products=[],published=[],busy=false;
function publicProduct(p){
 const price=Number(p.sellingPrice);
 if(!Number.isFinite(price)||price<0)throw Error("Invalid selling price: "+(p.name||p.id));
 const image=safeImage(p.image||p.imageUrl||"");
 if(image.length>750000)throw Error("Image too large: "+p.name+". Resize the product image first.");
 const stocks=p.branchStock&&typeof p.branchStock==="object"?Object.values(p.branchStock):[p.quantity];
 return {name:String(p.name||"Unnamed product").slice(0,200),category:String(p.category||"").slice(0,100),
 description:String(p.description||"").slice(0,3000),sellingPrice:price,image,
 available:stocks.reduce((n,q)=>n+(Number(q)||0),0)>0,published:true,updatedAt:serverTimestamp()};
}
onAuthStateChanged(auth,async user=>{
 if(!user){$("status").textContent="Sign in to the Jufelix ERP first, then reopen this page.";return;}
 try{
 const profile=await getDocFromServer(doc(db,"users",user.uid));
 const data=profile.exists()?profile.data():{};
 if(data.status!=="active"||!["admin","administrator"].includes(data.role))throw Error("Only active Administrators can publish the catalogue.");
 const [inventory,existing]=await Promise.all([getDocsFromServer(collection(db,"products")),getDocsFromServer(collection(db,"publicCatalogue"))]);
 products=inventory.docs.map(d=>({...d.data(),id:d.id})).sort((a,b)=>String(a.name).localeCompare(String(b.name)));
 published=existing.docs.map(d=>d.id);
 products.forEach(p=>{
 const row=node("label",undefined,"adminrow"),check=node("input");check.type="checkbox";check.value=p.id;check.checked=published.includes(p.id);check.className="productChoice";
 const info=node("span");info.append(node("strong",p.name||"Unnamed product"),node("div",p.category||"Uncategorised","muted"));
 row.append(check,info,node("span",money(p.sellingPrice)));$("choices").append(row);
 });
 $("controls").hidden=false;$("status").textContent=products.length+" ERP products loaded. Select only products you want customers to see.";
 }catch(error){$("status").classList.add("error");$("status").textContent=error.message;}
});
$("selectAll").addEventListener("click",()=>document.querySelectorAll(".productChoice").forEach(c=>c.checked=true));
$("selectNone").addEventListener("click",()=>document.querySelectorAll(".productChoice").forEach(c=>c.checked=false));
$("publish").addEventListener("click",async()=>{
 if(busy)return;
 const chosen=new Set([...document.querySelectorAll(".productChoice:checked")].map(c=>c.value));
 busy=true;$("publish").disabled=true;
 const approved=await confirmPublication(chosen.size);
 if(!approved){busy=false;$("publish").disabled=false;return;}
 try{
 // Validate every product before writing anything. Replace full public docs; never merge private fields.
 const writes=products.filter(p=>chosen.has(p.id)).map(p=>({id:p.id,data:publicProduct(p)}));
 const removals=published.filter(id=>!chosen.has(id));
 const ops=[...writes.map(p=>({type:"set",...p})),...removals.map(id=>({type:"delete",id}))];
 let committed=0;
 // Embedded product photos make count-only batches unsafe. Each validated
 // public document is below 1 MiB, so commit exactly one operation per request.
 for(const op of ops){
 const batch=writeBatch(db);
 const ref=doc(db,"publicCatalogue",op.id);
 if(op.type==="set")batch.set(ref,op.data);else batch.delete(ref);
 await batch.commit();
 if(op.type==="set"){if(!published.includes(op.id))published.push(op.id);}
 else published=published.filter(id=>id!==op.id);
 committed++;
 $("status").classList.remove("error");
 $("status").textContent="Publishing... "+committed+" of "+ops.length+" updates saved. Keep this page open.";
 }
 published=[...chosen];$("status").classList.remove("error");$("status").textContent="Published "+writes.length+" products. "+removals.length+" items unpublished. ERP data unchanged. Open the customer catalogue to verify.";
 }catch(error){$("status").classList.add("error");$("status").textContent="Publishing failed or was incomplete. Check your connection and rules, then retry. "+error.message;}
 finally{busy=false;$("publish").disabled=false;}
});

function confirmPublication(count){
 return new Promise(resolve=>{
 const dialog=document.createElement("dialog");
 dialog.setAttribute("aria-labelledby","publishConfirmTitle");
 const heading=node("h2","Publish your catalogue?");heading.id="publishConfirmTitle";
 const brand=node("div","JUFELIX SERVICES","category");
 const message=node("p","Publish "+count+" selected products? Unchecked products will be removed from the public catalogue only.");
 const assurance=node("p","Your ERP products, stock and sales records will not change.","notice");
 const form=node("form");form.method="dialog";form.className="actions";
 const cancel=node("button","Cancel","secondary");cancel.value="cancel";cancel.autofocus=true;
 const accept=node("button","Publish catalogue");accept.value="publish";
 form.append(cancel,accept);dialog.append(brand,heading,message,assurance,form);
 dialog.addEventListener("close",()=>{const approved=dialog.returnValue==="publish";dialog.remove();resolve(approved);},{once:true});
 document.body.append(dialog);dialog.showModal();
 });
}
