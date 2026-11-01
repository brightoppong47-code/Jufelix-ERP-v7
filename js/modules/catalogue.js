
import {initializeApp} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {getFirestore,collection,query,where,getDocsFromServer} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
const $=id=>document.getElementById(id);
const money=n=>"GHS "+Number(n||0).toLocaleString("en-GH",{minimumFractionDigits:2,maximumFractionDigits:2});
function safeImage(value){return typeof value==="string" && (/^data:image\/(png|jpeg|webp);base64,/i.test(value)||/^https:\/\//i.test(value))?value:"";}
function node(tag,text,className){const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);if(className)e.className=className;return e;}
let products=[],cart=new Map();
function render(){
 const search=$("search").value.trim().toLowerCase(),category=$("category").value;
 const visible=products.filter(p=>(!category||p.category===category)&&[p.name,p.category,p.description].join(" ").toLowerCase().includes(search));
 $("products").replaceChildren();
 visible.forEach(p=>{
  const card=node("article",undefined,"card"),photo=node("div",undefined,"photo");
  const src=safeImage(p.image);
  if(src){const img=node("img");img.src=src;img.alt=p.name;img.loading="lazy";img.addEventListener("error",()=>{photo.replaceChildren(node("span","📦"));});photo.append(img);}else photo.textContent="📦";
  const body=node("div",undefined,"content");
  body.append(node("div",p.category||"Jufelix collection","category"),node("h2",p.name),node("span",p.available?"Available to order":"Ask about availability",p.available?"badge":"badge unavailable"),node("p",p.description||"","muted"),node("div",money(p.sellingPrice),"price"));
  const add=node("button",p.available?"Add to order":"Currently unavailable");add.disabled=!p.available;
  add.addEventListener("click",()=>{cart.set(p.id,Math.min(99,(cart.get(p.id)||0)+1));updateCart();add.textContent="Added ✓";setTimeout(()=>add.textContent="Add to order",900);});
  body.append(add);card.append(photo,body);$("products").append(card);
 });
 if(!visible.length)$("products").append(node("p",products.length?"No products match your search.":"No products published yet. Please check back soon."));
 $("count").textContent=visible.length+" products";
}
function updateCart(){
 let amount=0,quantity=0;
 cart.forEach((q,id)=>{const p=products.find(p=>p.id===id);if(p){quantity+=q;amount+=q*p.sellingPrice;}});
 $("cartSummary").textContent=quantity+" item(s) • "+money(amount);
 $("review").disabled=!quantity;
}
function review(){
 $("orderRows").replaceChildren();
 cart.forEach((q,id)=>{
  const p=products.find(p=>p.id===id);if(!p)return;
  const row=node("div",undefined,"row"),info=node("div");
  info.append(node("strong",p.name),node("div",money(p.sellingPrice)+" each","muted"));
  const qty=node("input");qty.type="number";qty.min="1";qty.max="99";qty.value=q;qty.setAttribute("aria-label","Quantity for "+p.name);
  qty.addEventListener("change",()=>{const value=Math.min(99,Math.max(1,Math.trunc(Number(qty.value)||1)));cart.set(id,value);qty.value=value;updateCart();});
  const remove=node("button","Remove","secondary");remove.addEventListener("click",()=>{cart.delete(id);updateCart();review();});
  row.append(info,qty,remove);$("orderRows").append(row);
 });
 $("send").disabled=!cart.size;
}
$("search").addEventListener("input",render);$("category").addEventListener("change",render);
$("review").addEventListener("click",()=>{review();$("orderDialog").showModal();});
$("close").addEventListener("click",()=>$("orderDialog").close());
$("send").addEventListener("click",()=>{
 if(!cart.size)return;
 let total=0;
 const lines=["Hello Jufelix Services, I would like to order:"];
 cart.forEach((quantity,id)=>{const p=products.find(p=>p.id===id);if(p){const amount=quantity*p.sellingPrice;total+=amount;lines.push(quantity+" x "+p.name+" — "+money(amount));}});
 lines.push("","Estimated product total: "+money(total));
 if($("customerName").value.trim())lines.push("Name: "+$("customerName").value.trim());
 if($("location").value.trim())lines.push("Delivery area / pickup request: "+$("location").value.trim());
 lines.push("Please confirm availability, final prices, delivery fee and payment instructions.");
 const url="https://wa.me/233244252983?text="+encodeURIComponent(lines.join("\n"));
 if(url.length>7000){$("orderMessage").textContent="Order is too long for one WhatsApp message. Please reduce the items and send in parts.";return;}
 window.open(url,"_blank","noopener,noreferrer");
});
try{
 const app=initializeApp(window.JUFELIX_FIREBASE_CONFIG),db=getFirestore(app);
 const snapshot=await getDocsFromServer(query(collection(db,"publicCatalogue"),where("published","==",true)));
 products=snapshot.docs.map(d=>({...d.data(),id:d.id})).filter(p=>typeof p.name==="string"&&Number.isFinite(p.sellingPrice)&&p.sellingPrice>=0).sort((a,b)=>a.name.localeCompare(b.name));
 [...new Set(products.map(p=>p.category).filter(Boolean))].sort().forEach(c=>{const option=node("option",c);option.value=c;$("category").append(option);});
 $("status").textContent="Catalogue loaded. Prices and availability are confirmed when we accept your WhatsApp order.";
 render();
}catch(error){$("status").classList.add("error");$("status").textContent="Unable to load the catalogue. Please check your connection or contact us on WhatsApp. "+(error.code||"");}
