/* JUFELIX ERP v7.0 - corrected users.js */
(function(){
'use strict';
const USERS_KEY='jufelix_v7_users';
const BRANCHES_KEY='jufelix_v7_branches';
let editingId=null;
const $=(...ids)=>ids.map(id=>document.getElementById(id)).find(Boolean)||null;
const read=(k)=>{try{const v=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(v)?v:[]}catch(e){return[]}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const val=(el)=>el?String(el.value||'').trim():'';
const esc=(v)=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
let el={};
document.addEventListener('DOMContentLoaded',init);
function init(){
 el={form:$('userForm','usersForm'),fullName:$('fullName','userFullName'),email:$('email','userEmail'),phone:$('phone','userPhone'),username:$('username','userUsername'),password:$('password','userPassword'),role:$('role','userRole'),branch:$('branch','branchId','userBranch'),status:$('status','userStatus'),search:$('searchUsers','userSearch'),roleFilter:$('roleFilter','userRoleFilter'),branchFilter:$('branchFilter','userBranchFilter'),tbody:$('usersTableBody','userTableBody','usersTable'),save:$('saveUserButton','saveUserBtn'),reset:$('resetUserButton','resetUserBtn'),message:$('userMessage','usersMessage','formMessage')};
 ensureAdmin(); loadBranches(); bind(); render();
}
function bind(){
 if(el.form) el.form.addEventListener('submit',saveUser);
 if(el.reset) el.reset.addEventListener('click',e=>{e.preventDefault();resetForm()});
 [el.search,el.roleFilter,el.branchFilter].filter(Boolean).forEach(x=>x.addEventListener(x.tagName==='INPUT'?'input':'change',render));
}
async function saveUser(e){
 e.preventDefault();
 const branchId=val(el.branch)||'head-office';
 const branch=read(BRANCHES_KEY).find(b=>String(b.id)===String(branchId));
 const data={fullName:val(el.fullName),name:val(el.fullName),email:val(el.email).toLowerCase(),phone:val(el.phone),username:val(el.username).toLowerCase(),password:el.password?el.password.value:'',role:normalizeRole(val(el.role)),branchId,branchName:(branch&&(branch.name||branch.branchName))||(el.branch&&el.branch.selectedOptions[0]?el.branch.selectedOptions[0].textContent:'Head Office'),status:val(el.status)||'active'};
 if(!data.fullName)return msg('Enter the user full name.','error');
 if(!data.email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))return msg('Enter a valid email address.','error');
 if(!data.username)data.username=data.email.split('@')[0];
 if(!data.role)return msg('Select a user role.','error');
 if(!editingId&&data.password.length<6)return msg('Password must contain at least 6 characters.','error');
 let users=read(USERS_KEY);
 if(users.some(u=>String(u.email||'').toLowerCase()===data.email&&String(u.id)!==String(editingId||'')))return msg('A user with this email already exists.','error');
 if(users.some(u=>String(u.username||'').toLowerCase()===data.username&&String(u.id)!==String(editingId||'')))return msg('This username is already in use.','error');
 setSaving(true);
 try{
   if(window.JufelixUsersCloud&&typeof window.JufelixUsersCloud.createUser==='function'&&!editingId){
      const cloudUser=await window.JufelixUsersCloud.createUser(data);
      data.id=(cloudUser&&cloudUser.uid)||(cloudUser&&cloudUser.id)||('user-'+Date.now());
      data.uid=(cloudUser&&cloudUser.uid)||'';
   } else { data.id=editingId||('user-'+Date.now()+'-'+Math.random().toString(36).slice(2,7)); }
   users=read(USERS_KEY);
   const i=users.findIndex(u=>String(u.id)===String(editingId||data.id));
   const record={...(i>=0?users[i]:{}),...data,updatedAt:new Date().toISOString()};
   if(i>=0){ if(!data.password)record.password=users[i].password||''; users[i]=record; } else {record.createdAt=new Date().toISOString();users.push(record);}
   write(USERS_KEY,users); msg(editingId?'User updated successfully.':'User created successfully.','success'); resetForm(); render();
 }catch(err){console.error(err);msg(friendly(err),'error')}finally{setSaving(false)}
}
function loadBranches(){if(!el.branch)return;let b=read(BRANCHES_KEY);if(!b.some(x=>String(x.id)==='head-office'))b.unshift({id:'head-office',name:'Head Office',status:'active'});el.branch.innerHTML='<option value="">Select Branch</option>'+b.filter(x=>String(x.status||'active').toLowerCase()==='active').map(x=>`<option value="${esc(x.id)}">${esc(x.name||x.branchName||'Branch')}</option>`).join('')}
function render(){if(!el.tbody)return;let users=read(USERS_KEY);const q=val(el.search).toLowerCase(),rf=normalizeRole(val(el.roleFilter)),bf=val(el.branchFilter);users=users.filter(u=>(!q||[u.fullName,u.email,u.phone,u.username,u.role,u.branchName].join(' ').toLowerCase().includes(q))&&(!rf||rf==='all'||normalizeRole(u.role)===rf)&&(!bf||bf==='all'||String(u.branchId||'head-office')===String(bf)));if(!users.length){el.tbody.innerHTML='<tr><td colspan="8" style="text-align:center;padding:28px">No users found.</td></tr>';return}el.tbody.innerHTML=users.map(u=>`<tr><td>${esc(u.fullName||u.name||'—')}</td><td>${esc(u.email||'—')}</td><td>${esc(u.phone||'—')}</td><td>${esc(roleName(u.role))}</td><td>${esc(u.branchName||'Head Office')}</td><td>${esc(u.status||'active')}</td><td><button type="button" data-edit="${esc(u.id)}">Edit</button></td><td><button type="button" data-delete="${esc(u.id)}">Delete</button></td></tr>`).join('');el.tbody.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(b.dataset.edit));el.tbody.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>remove(b.dataset.delete));}
function edit(id){const u=read(USERS_KEY).find(x=>String(x.id)===String(id));if(!u)return;editingId=u.id;[['fullName',u.fullName||u.name],['email',u.email],['phone',u.phone],['username',u.username],['role',normalizeRole(u.role)],['branch',u.branchId],['status',u.status]].forEach(([k,v])=>{if(el[k])el[k].value=v||''});if(el.password){el.password.value='';el.password.required=false;el.password.placeholder='Leave blank to keep current password'}if(el.save)el.save.textContent='💾 Update User';}
function remove(id){let users=read(USERS_KEY);const u=users.find(x=>String(x.id)===String(id));if(!u)return;if(String(u.username).toLowerCase()==='admin')return msg('The default administrator cannot be deleted.','error');if(!confirm('Delete '+(u.fullName||u.username||'this user')+'?'))return;users=users.filter(x=>String(x.id)!==String(id));write(USERS_KEY,users);render();msg('User removed successfully.','success')}
function resetForm(){editingId=null;if(el.form)el.form.reset();if(el.password){el.password.required=true;el.password.placeholder='Enter password'}if(el.status)el.status.value='active';if(el.save)el.save.textContent='💾 Save User'}
function ensureAdmin(){let u=read(USERS_KEY);if(!u.some(x=>String(x.username||'').toLowerCase()==='admin')){u.push({id:'user-admin',fullName:'System Administrator',name:'System Administrator',username:'admin',password:'admin123',role:'admin',branchId:'head-office',branchName:'Head Office',status:'active',createdAt:new Date().toISOString()});write(USERS_KEY,u)}}
function normalizeRole(v){v=String(v||'').trim().toLowerCase();return {'administrator':'admin','sales officer':'sales','sales personnel':'sales','stock keeper':'stockkeeper'}[v]||v}
function roleName(v){return {admin:'Administrator',manager:'Manager',sales:'Sales Officer',cashier:'Cashier',stockkeeper:'Stock Keeper'}[normalizeRole(v)]||v||'—'}
function setSaving(on){if(el.save){el.save.disabled=on;el.save.textContent=on?'Saving...':(editingId?'💾 Update User':'💾 Save User')}}
function friendly(e){const c=String(e&&e.code||'');if(c.includes('email-already-in-use'))return'This email is already registered in Firebase Authentication.';if(c.includes('weak-password'))return'Password must contain at least 6 characters.';if(c.includes('permission-denied'))return'Firestore denied this operation. Check your rules.';return(e&&e.message)||'The user could not be saved.'}
function msg(text,type){if(el.message){el.message.textContent=text;el.message.className='user-message '+type;el.message.style.display='block'}else alert(text)}
window.JufelixUsers={refresh:render};
})();
