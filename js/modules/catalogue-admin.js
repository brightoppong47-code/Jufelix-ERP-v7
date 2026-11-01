
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
 if(!confirm("Publish "+chosen.size+" selected products? Unchecked products will be removed from the public catalogue only. ERP stock and records will not change."))return;
 busy=true;$("publish").disabled=true;
 try{
 // Validate every product before writing anything. Replace full public docs; never merge private fields.
 const writes=products.filter(p=>chosen.has(p.id)).map(p=>({id:p.id,data:publicProduct(p)}));
 const removals=published.filter(id=>!chosen.has(id));
 const ops=[...writes.map(p=>({type:"set",...p})),...removals.map(id=>({type:"delete",id}))];
 let committed=0;
 for(let i=0;i<ops.length;i+=400){
 const batch=writeBatch(db);ops.slice(i,i+400).forEach(op=>{const ref=doc(db,"publicCatalogue",op.id);if(op.type==="set")batch.set(ref,op.data);else batch.delete(ref);});
 await batch.commit();committed+=Math.min(400,ops.length-i);$("status").textContent="Publishing... "+committed+" updates saved.";
 }
 published=[...chosen];$("status").classList.remove("error");$("status").textContent="Published "+writes.length+" products. "+removals.length+" items unpublished. ERP data unchanged. Open the customer catalogue to verify.";
 }catch(error){$("status").classList.add("error");$("status").textContent="Publishing failed or was incomplete. Check your connection and rules, then retry. "+error.message;}
 finally{busy=false;$("publish").disabled=false;}
});
