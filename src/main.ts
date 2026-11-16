import "./style.css";

type Status = "جديد" | "قيد التنفيذ" | "جاهز للتسليم" | "تم التسليم";
type Order = {
  id: number; customer: string; phone: string; service: string;
  details: string; quantity: number; price: number; paid: number;
  due: string; status: Status; created: string;
};

const STORE = "enjezly-orders-v1";
const initialOrders: Order[] = [
  { id: 1001, customer: "محمد أحمد", phone: "01012345678", service: "طباعة ملازم", details: "A4 - أبيض وأسود - وجهين", quantity: 120, price: 360, paid: 200, due: "2026-11-17", status: "قيد التنفيذ", created: "2026-11-16" },
  { id: 1002, customer: "سارة محمود", phone: "01123456789", service: "تصوير مستندات", details: "A4 - أبيض وأسود", quantity: 45, price: 45, paid: 45, due: "2026-11-16", status: "جاهز للتسليم", created: "2026-11-16" },
  { id: 1003, customer: "أحمد علي", phone: "01234567890", service: "طباعة صور", details: "13×18 - ورق لامع", quantity: 10, price: 100, paid: 0, due: "2026-11-18", status: "جديد", created: "2026-11-16" },
  { id: 1004, customer: "منى حسن", phone: "01555555555", service: "تجليد", details: "تجليد حراري", quantity: 3, price: 75, paid: 75, due: "2026-11-15", status: "تم التسليم", created: "2026-11-15" }
];

function loadOrders(): Order[] {
  try {
    const raw = localStorage.getItem(STORE);
    return raw ? JSON.parse(raw) as Order[] : initialOrders;
  } catch { return initialOrders; }
}
let orders = loadOrders();
let currentPage = "dashboard";
let searchTerm = "";
type AssistantMessage = { role: "user" | "assistant"; content: string };
let assistantMessages: AssistantMessage[] = (() => { try { return JSON.parse(localStorage.getItem("enjezly-ai-chat") || "[]"); } catch { return []; } })();
let assistantBusy = false;

const app = document.querySelector<HTMLDivElement>("#app")!;
const money = (n: number) => `${n.toLocaleString("ar-EG")} ج.م`;
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
const save = () => localStorage.setItem(STORE, JSON.stringify(orders));
const count = (status: Status) => orders.filter(o => o.status === status).length;
const totalSales = () => orders.reduce((sum, o) => sum + o.price, 0);
const totalPaid = () => orders.reduce((sum, o) => sum + o.paid, 0);

function shell(content: string): string {
  return `
  <div class="layout">
    <aside class="sidebar">
      <div class="brand"><img src="/enjezly-logo.png" alt="إنجزلي"><div><b>إنجزلي</b><small>ENJEZLY</small></div></div>
      <div class="side-label">القائمة الرئيسية</div>
      <nav>
        <button class="nav-item ${currentPage === "dashboard" ? "active" : ""}" data-page="dashboard"><span>▦</span> لوحة التحكم</button>
        <button class="nav-item ${currentPage === "orders" ? "active" : ""}" data-page="orders"><span>▤</span> إدارة الطلبات <i>${orders.length}</i></button>
        <button class="nav-item ${currentPage === "customers" ? "active" : ""}" data-page="customers"><span>♙</span> العملاء</button>
        <button class="nav-item ${currentPage === "inventory" ? "active" : ""}" data-page="inventory"><span>▧</span> المخزون</button>
        <button class="nav-item ${currentPage === "reports" ? "active" : ""}" data-page="reports"><span>▥</span> التقارير والحسابات</button>
        <button class="nav-item ${currentPage === "assistant" ? "active" : ""}" data-page="assistant"><span>✦</span> المساعد الذكي <i class="ai-badge">AI</i></button>
      </nav>
      <div class="sidebar-bottom"><div class="help-card"><div class="help-icon">✦</div><b>إنجز شغلك بسهولة</b><p>من أول الطلب لحد التسليم!</p></div><div class="user-mini"><div class="avatar">م</div><div><b>مدير المكتبة</b><small>مسؤول النظام</small></div><span>⋯</span></div></div>
    </aside>
    <main class="main">
      <header class="topbar"><div><div class="eyebrow">نظام إدارة مكتبات الطباعة والاستديوهات</div><h1>${pageTitle()}</h1></div><div class="top-actions"><span class="today">● النظام يعمل</span><button class="icon-btn" title="الإشعارات">♧</button><button class="primary-btn" id="quick-add">＋ طلب جديد</button></div></header>
      <section class="content">${content}</section>
      <footer>© 2026 إنجزلي ENJEZLY <span>من أول الطلب لحد التسليم!</span></footer>
    </main>
  </div>
  <div id="modal-root"></div>`;
}
function pageTitle() {
  return ({dashboard:"لوحة التحكم",orders:"إدارة الطلبات",customers:"إدارة العملاء",inventory:"إدارة المخزون",reports:"التقارير والحسابات",assistant:"ENJEZLY AI — المساعد الذكي"} as Record<string,string>)[currentPage] || "لوحة التحكم";
}
function statCard(label: string, value: string, hint: string, icon: string, color: string) {
  return `<article class="stat-card"><div class="stat-top"><span>${label}</span><span class="stat-icon ${color}">${icon}</span></div><strong>${value}</strong><small>${hint}</small></article>`;
}
function orderRows(list: Order[]) {
  if (!list.length) return `<tr><td colspan="7" class="empty">لا توجد طلبات مطابقة.</td></tr>`;
  return list.map(o => `<tr>
    <td><b class="order-id">#${o.id}</b><small class="cell-sub">${escapeHtml(o.created)}</small></td>
    <td><b>${escapeHtml(o.customer)}</b><small class="cell-sub">${escapeHtml(o.phone)}</small></td>
    <td>${escapeHtml(o.service)}<small class="cell-sub">${escapeHtml(o.details)}</small></td>
    <td>${o.quantity}</td><td><b>${money(o.price)}</b></td>
    <td><span class="status ${statusClass(o.status)}">${o.status}</span></td>
    <td><button class="more-btn" data-view="${o.id}">التفاصيل　⌄</button></td>
  </tr>`).join("");
}
function statusClass(s: Status) { return s === "جديد" ? "new" : s === "قيد التنفيذ" ? "progress" : s === "جاهز للتسليم" ? "ready" : "done"; }
function dashboard() {
  const latest = [...orders].sort((a,b)=>b.id-a.id).slice(0,5);
  return `<div class="welcome"><div><h2>أهلاً بيك في إنجزلي 👋</h2><p>تابع شغل مكتبتك وطلبات العملاء من مكان واحد.</p></div><button class="outline-btn" data-page="orders">عرض كل الطلبات ←</button></div>
  <div class="stats-grid">
    ${statCard("إجمالي الطلبات", String(orders.length), "كل الطلبات المسجلة", "▤", "blue")}
    ${statCard("طلبات قيد التنفيذ", String(count("قيد التنفيذ")+count("جديد")), "تحتاج إلى متابعة", "◷", "orange")}
    ${statCard("جاهز للتسليم", String(count("جاهز للتسليم")), "في انتظار العميل", "✓", "green")}
    ${statCard("إجمالي المبيعات", money(totalSales()), "قيمة الطلبات المسجلة", "ج.م", "purple")}
  </div>
  <div class="dashboard-grid"><section class="panel wide"><div class="panel-head"><div><h3>أحدث الطلبات</h3><p>آخر الطلبات التي تم تسجيلها في النظام</p></div><button class="text-btn" data-page="orders">عرض الكل</button></div><div class="table-wrap"><table><thead><tr><th>رقم الطلب</th><th>العميل</th><th>الخدمة</th><th>الكمية</th><th>الإجمالي</th><th>الحالة</th><th></th></tr></thead><tbody>${orderRows(latest)}</tbody></table></div></section>
  <section class="panel"><div class="panel-head"><div><h3>حالة الطلبات</h3><p>توزيع الطلبات الحالية</p></div></div><div class="status-list">${(["جديد","قيد التنفيذ","جاهز للتسليم","تم التسليم"] as Status[]).map((s,i)=>`<div class="status-line"><span class="dot dot-${i}"></span><span>${s}</span><b>${count(s)}</b></div>`).join("")}</div><div class="mini-note">إجمالي المحصل: <b>${money(totalPaid())}</b></div></section></div>`;
}
function ordersPage() {
  const selectedStatus = (window as any).__enjezlyStatusFilter || "الكل";
  const list = orders.filter(o =>
    [o.customer,o.phone,o.service,String(o.id),o.status].some(v=>v.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (selectedStatus === "الكل" || o.status === selectedStatus)
  );
  return `<div class="toolbar"><div class="search-box">⌕ <input id="search" placeholder="ابحث باسم العميل أو رقم الطلب..." value="${escapeHtml(searchTerm)}"></div><select class="filter-select" id="status-filter" aria-label="تصفية حسب حالة الطلب"><option ${selectedStatus==="الكل"?"selected":""}>الكل</option>${(["جديد","قيد التنفيذ","جاهز للتسليم","تم التسليم"] as Status[]).map(s=>`<option ${selectedStatus===s?"selected":""}>${s}</option>`).join("")}</select><button class="primary-btn" id="add-order">＋ إضافة طلب جديد</button></div>
  <section class="panel"><div class="panel-head"><div><h3>كل الطلبات <span class="count-pill">${orders.length}</span></h3><p>تابع حالة كل طلب وتفاصيل تنفيذه</p></div></div><div class="table-wrap"><table><thead><tr><th>رقم الطلب</th><th>العميل</th><th>الخدمة والمواصفات</th><th>الكمية</th><th>الإجمالي</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>${orderRows(list)}</tbody></table></div></section>`;
}
function customersPage() {
  const map = new Map<string,Order[]>();
  orders.forEach(o=>map.set(o.phone,[...(map.get(o.phone)||[]),o]));
  const customers = [...map.entries()];
  return `<section class="panel"><div class="panel-head"><div><h3>قائمة العملاء</h3><p>يتم تجميع العملاء تلقائياً من الطلبات المسجلة</p></div></div><div class="table-wrap"><table><thead><tr><th>اسم العميل</th><th>رقم الهاتف</th><th>عدد الطلبات</th><th>إجمالي التعاملات</th><th>المتبقي</th></tr></thead><tbody>${customers.map(([phone,os])=>`<tr><td><b>${escapeHtml(os[0].customer)}</b></td><td>${escapeHtml(phone)}</td><td>${os.length}</td><td>${money(os.reduce((s,o)=>s+o.price,0))}</td><td>${money(os.reduce((s,o)=>s+o.price-o.paid,0))}</td></tr>`).join("") || `<tr><td colspan="5" class="empty">لا يوجد عملاء بعد.</td></tr>`}</tbody></table></div></section>`;
}
function inventoryPage() {
  const items = [{name:"ورق تصوير A4",qty:12,unit:"رزمة",min:5},{name:"ورق فوتوغرافي لامع",qty:3,unit:"عبوة",min:5},{name:"حبر أسود",qty:2,unit:"عبوة",min:3},{name:"دبابيس تجليد",qty:18,unit:"علبة",min:4}];
  return `<div class="notice">هذه نسخة أولية لواجهة المخزون. يمكنك تعديل الكميات تجريبياً، وسيتم حفظها أثناء الجلسة القادمة في مرحلة التطوير التالية.</div><section class="panel"><div class="panel-head"><div><h3>المستلزمات والخامات</h3><p>متابعة الكميات المتاحة والتنبيه عند انخفاض المخزون</p></div><button class="outline-btn" id="stock-add">＋ إضافة صنف</button></div><div class="table-wrap"><table><thead><tr><th>الصنف</th><th>الكمية المتاحة</th><th>الوحدة</th><th>الحالة</th></tr></thead><tbody>${items.map(i=>`<tr><td><b>${i.name}</b></td><td>${i.qty}</td><td>${i.unit}</td><td><span class="status ${i.qty<=i.min?"new":"done"}">${i.qty<=i.min?"مخزون منخفض":"متوفر"}</span></td></tr>`).join("")}</tbody></table></div></section>`;
}
function reportsPage() {
  const due = orders.reduce((s,o)=>s+o.price-o.paid,0);
  return `<div class="stats-grid">${statCard("إجمالي المبيعات",money(totalSales()),"قيمة كل الطلبات","ج.م","blue")}${statCard("المبالغ المحصلة",money(totalPaid()),"المدفوع من العملاء","✓","green")}${statCard("المبالغ المتبقية",money(due),"مستحقات غير محصلة","◷","orange")}${statCard("عدد الطلبات",String(orders.length),"كل الطلبات المسجلة","▤","purple")}</div><section class="panel"><div class="panel-head"><div><h3>ملخص الحسابات</h3><p>ملخص مالي مبني على بيانات الطلبات الحالية</p></div><button class="outline-btn" id="export-csv">تصدير Excel / CSV ↓</button></div><div class="finance-row"><span>إجمالي قيمة الطلبات</span><b>${money(totalSales())}</b></div><div class="finance-row"><span>إجمالي المدفوع</span><b class="green-text">${money(totalPaid())}</b></div><div class="finance-row"><span>إجمالي المتبقي</span><b class="orange-text">${money(due)}</b></div><p class="muted small">ملاحظة: الأرباح الفعلية تحتاج تسجيل تكلفة الخامات والمصروفات، وسيتم إضافتها في مرحلة الحسابات المتقدمة.</p></section>`;
}
function businessContext() {
  return {
    currency: "EGP",
    totals: { orders: orders.length, new: count("جديد"), inProgress: count("قيد التنفيذ"), ready: count("جاهز للتسليم"), delivered: count("تم التسليم"), sales: totalSales(), collected: totalPaid(), remaining: orders.reduce((sum,o)=>sum+o.price-o.paid,0) },
    orders: orders.map(o=>({ id:o.id, customer:o.customer, service:o.service, details:o.details, quantity:o.quantity, total:o.price, paid:o.paid, remaining:o.price-o.paid, due:o.due, status:o.status, created:o.created }))
  };
}
function assistantPage() {
  const messages = assistantMessages.map(m=>`<div class="chat-row ${m.role}"><div class="chat-avatar">${m.role==="assistant"?"✦":"أ"}</div><div class="chat-bubble"><div class="chat-name">${m.role==="assistant"?"ENJEZLY AI":"أنت"}</div><div>${escapeHtml(m.content).replace(/\n/g,"<br>")}</div></div></div>`).join("");
  return `<div class="ai-layout"><section class="ai-main panel"><div class="ai-head"><div class="ai-orb">✦</div><div><h2>مساعد إنجزلي الذكي</h2><p><span class="online-dot"></span> متصل بنموذج Groq · جاهز لمساعدتك</p></div><button class="outline-btn" id="clear-chat">محادثة جديدة ↻</button></div><div class="chat-disclaimer">المساعد يقرأ ملخص الطلبات المسجل في هذا المتصفح للإجابة عن أسئلتك. لا يغيّر الطلبات بنفسه حتى الآن.</div><div class="chat-messages" id="chat-messages">${messages || `<div class="ai-welcome"><div class="ai-welcome-icon">✦</div><h3>أهلاً بيك! أنا مساعد إنجزلي 👋</h3><p>اسألني عن الطلبات والمبيعات والمبالغ المتبقية، أو اطلب مني أفكاراً لتنظيم شغل المكتبة.</p><div class="prompt-chips"><button data-prompt="لخص لي حالة الطلبات الحالية وعدد كل حالة.">📋 ملخص الطلبات</button><button data-prompt="كم إجمالي المبيعات والمبالغ المحصلة والمتبقية؟">💰 ملخص الحسابات</button><button data-prompt="ما الطلبات التي موعد تسليمها اليوم أو فات؟">⏰ الطلبات المستحقة</button><button data-prompt="اقترح 5 طرق لتقليل هدر الورق والحبر في المكتبة.">🖨️ تقليل الهدر</button></div></div>`}</div><form class="chat-composer" id="chat-form"><textarea id="chat-input" rows="1" placeholder="اكتب سؤالك هنا..." maxlength="2000" required></textarea><button class="send-btn" id="send-chat" type="submit" ${assistantBusy?"disabled":""}>➤</button></form><div class="chat-footnote">قد يخطئ الذكاء الاصطناعي؛ راجع الأرقام المهمة من سجلات النظام.</div></section><aside class="ai-side"><section class="panel ai-side-card"><h3>تقدر تسألني عن</h3><ul><li>عدد الطلبات وحالتها</li><li>إجمالي المبيعات والتحصيل</li><li>الطلبات المتأخرة ومواعيد التسليم</li><li>أفكار التسعير وتقليل الهدر</li><li>تحسين خدمة العملاء</li></ul></section><section class="panel ai-side-card model-card"><small>المحرك الذكي</small><b>Groq · GPT-OSS 20B</b><span>استجابة سريعة للمحادثات والتحليل</span></section></aside></div>`;
}
function render() {
  const content = currentPage==="dashboard"?dashboard():currentPage==="orders"?ordersPage():currentPage==="customers"?customersPage():currentPage==="inventory"?inventoryPage():currentPage==="assistant"?assistantPage():reportsPage();
  app.innerHTML = shell(content);
  bind();
}
function openOrderModal(existing?: Order) {
  const editing = Boolean(existing);
  const value = (key: keyof Order) => existing ? escapeHtml(String(existing[key] ?? "")) : "";
  const root = document.querySelector<HTMLDivElement>("#modal-root")!;
  root.innerHTML = `<div class="modal-backdrop" id="backdrop"><form class="modal" id="order-form"><div class="modal-head"><div><h2>${editing ? `تعديل الطلب #${existing!.id}` : "إضافة طلب جديد"}</h2><p>${editing ? "يمكنك تعديل بيانات العميل ومواصفات الطلب" : "أدخل بيانات العميل ومواصفات الطباعة"}</p></div><button type="button" class="close-btn" id="close-modal">×</button></div>
  <div class="form-grid"><label>اسم العميل<input name="customer" required placeholder="اسم العميل" value="${value("customer")}"></label><label>رقم الهاتف<input name="phone" required inputmode="tel" placeholder="01xxxxxxxxx" value="${value("phone")}"></label><label>نوع الخدمة<select name="service">${["طباعة مستندات","طباعة ملازم","تصوير مستندات","طباعة صور","تجليد","تصميم وطباعة","خدمات استديو"].map(s=>`<option ${existing?.service===s?"selected":""}>${s}</option>`).join("")}${existing && !["طباعة مستندات","طباعة ملازم","تصوير مستندات","طباعة صور","تجليد","تصميم وطباعة","خدمات استديو"].includes(existing.service)?`<option selected>${escapeHtml(existing.service)}</option>`:""}</select></label><label>الكمية<input name="quantity" type="number" min="1" value="${existing?.quantity ?? 1}" required></label><label class="full">مواصفات الطلب<textarea name="details" rows="2" placeholder="مثال: A4، ألوان، وجه واحد...">${value("details")}</textarea></label><label>السعر الإجمالي (ج.م)<input name="price" type="number" min="0" step="0.5" value="${existing?.price ?? ""}" required></label><label>المبلغ المدفوع (ج.م)<input name="paid" type="number" min="0" step="0.5" value="${existing?.paid ?? 0}" required></label><label>موعد التسليم<input name="due" type="date" value="${value("due")}" required></label><label>حالة الطلب<select name="status">${(["جديد","قيد التنفيذ","جاهز للتسليم","تم التسليم"] as Status[]).map(s=>`<option ${existing?.status===s?"selected":""}>${s}</option>`).join("")}</select></label></div>
  <div class="modal-actions"><button type="button" class="outline-btn" id="cancel-modal">إلغاء</button><button class="primary-btn" type="submit">${editing ? "حفظ التعديلات" : "حفظ الطلب"}</button></div></form></div>`;
  document.querySelector("#close-modal")?.addEventListener("click",closeModal);
  document.querySelector("#cancel-modal")?.addEventListener("click",closeModal);
  document.querySelector("#backdrop")?.addEventListener("click",e=>{if(e.target===e.currentTarget)closeModal();});
  document.querySelector<HTMLFormElement>("#order-form")?.addEventListener("submit",e=>{
    e.preventDefault();
    const data = new FormData(e.currentTarget as HTMLFormElement);
    const price=Number(data.get("price")), paid=Number(data.get("paid"));
    if(paid>price){alert("المبلغ المدفوع لا يمكن أن يكون أكبر من الإجمالي.");return;}
    if(editing && existing) {
      Object.assign(existing, {
        customer:String(data.get("customer")).trim(), phone:String(data.get("phone")).trim(),
        service:String(data.get("service")), details:String(data.get("details")).trim(),
        quantity:Number(data.get("quantity")), price, paid, due:String(data.get("due")),
        status:String(data.get("status")) as Status
      });
    } else {
      const order:Order={id:Math.max(1000,...orders.map(o=>o.id))+1,customer:String(data.get("customer")).trim(),phone:String(data.get("phone")).trim(),service:String(data.get("service")),details:String(data.get("details")).trim(),quantity:Number(data.get("quantity")),price,paid,due:String(data.get("due")),status:String(data.get("status")) as Status,created:new Date().toISOString().slice(0,10)};
      orders.unshift(order);
    }
    save();closeModal();currentPage="orders";render();
  });
}
function closeModal(){document.querySelector("#modal-root")!.innerHTML="";}
function showOrder(id:number) {
  const o=orders.find(x=>x.id===id); if(!o)return;
  const next:Status[]=["جديد","قيد التنفيذ","جاهز للتسليم","تم التسليم"];
  const root=document.querySelector<HTMLDivElement>("#modal-root")!;
  root.innerHTML=`<div class="modal-backdrop" id="backdrop"><div class="modal detail-modal"><div class="modal-head"><div><h2>تفاصيل الطلب #${o.id}</h2><p>${escapeHtml(o.customer)} · ${escapeHtml(o.phone)}</p></div><button class="close-btn" id="close-modal">×</button></div><div class="detail-grid"><div><small>الخدمة</small><b>${escapeHtml(o.service)}</b></div><div><small>الكمية</small><b>${o.quantity}</b></div><div><small>المواصفات</small><b>${escapeHtml(o.details||"—")}</b></div><div><small>موعد التسليم</small><b>${escapeHtml(o.due)}</b></div><div><small>الإجمالي</small><b>${money(o.price)}</b></div><div><small>المدفوع / المتبقي</small><b>${money(o.paid)} / ${money(o.price-o.paid)}</b></div></div><label class="status-edit">تحديث حالة الطلب<select id="status-select">${next.map(s=>`<option ${s===o.status?"selected":""}>${s}</option>`).join("")}</select></label><div class="modal-actions"><button class="danger-btn" id="delete-order">حذف الطلب</button><button class="outline-btn" id="edit-order">✎ تعديل بيانات الطلب</button><button class="primary-btn" id="save-status">حفظ الحالة</button></div></div></div>`;
  document.querySelector("#close-modal")?.addEventListener("click",closeModal);
  document.querySelector("#backdrop")?.addEventListener("click",e=>{if(e.target===e.currentTarget)closeModal();});
  document.querySelector("#save-status")?.addEventListener("click",()=>{o.status=document.querySelector<HTMLSelectElement>("#status-select")!.value as Status;save();closeModal();render();});
  document.querySelector("#edit-order")?.addEventListener("click",()=>{closeModal();openOrderModal(o);});
  document.querySelector("#delete-order")?.addEventListener("click",()=>{if(confirm("هل أنت متأكد من حذف هذا الطلب؟")){orders=orders.filter(x=>x.id!==id);save();closeModal();render();}});
}
function exportCSV(){
  const rows=[["رقم الطلب","العميل","الهاتف","الخدمة","المواصفات","الكمية","الإجمالي","المدفوع","المتبقي","الحالة","التسليم"],...orders.map(o=>[o.id,o.customer,o.phone,o.service,o.details,o.quantity,o.price,o.paid,o.price-o.paid,o.status,o.due])];
  const csv="\\uFEFF"+rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));
  const a=document.createElement("a");a.href=url;a.download="enjezly-orders.csv";a.click();URL.revokeObjectURL(url);
}
function addChatMessage(role: "user" | "assistant", content: string) {
  assistantMessages.push({role,content});
  assistantMessages=assistantMessages.slice(-24);
  localStorage.setItem("enjezly-ai-chat",JSON.stringify(assistantMessages));
}
function appendChatBubble(role: "user" | "assistant", content: string) {
  const box=document.querySelector<HTMLDivElement>("#chat-messages"); if(!box)return;
  const row=document.createElement("div"); row.className=`chat-row ${role}`;
  const avatar=document.createElement("div"); avatar.className="chat-avatar"; avatar.textContent=role==="assistant"?"✦":"أ";
  const bubble=document.createElement("div"); bubble.className="chat-bubble";
  const name=document.createElement("div"); name.className="chat-name"; name.textContent=role==="assistant"?"ENJEZLY AI":"أنت";
  const body=document.createElement("div"); body.textContent=content;
  bubble.append(name,body); row.append(avatar,bubble); box.append(row); box.scrollTop=box.scrollHeight;
}
async function sendAssistantMessage(text: string) {
  const clean=text.trim(); if(!clean || assistantBusy)return;
  if(assistantMessages.length===0){const welcome=document.querySelector(".ai-welcome");welcome?.remove();}
  addChatMessage("user",clean);appendChatBubble("user",clean);
  const input=document.querySelector<HTMLTextAreaElement>("#chat-input"); if(input)input.value="";
  assistantBusy=true;
  const send=document.querySelector<HTMLButtonElement>("#send-chat"); if(send)send.disabled=true;
  const box=document.querySelector<HTMLDivElement>("#chat-messages");
  const loading=document.createElement("div");loading.className="chat-loading";loading.id="chat-loading";loading.textContent="إنجزلي AI بيفكر...";box?.append(loading);if(box)box.scrollTop=box.scrollHeight;
  try {
    const response=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:assistantMessages,businessContext:businessContext()})});
    const data=await response.json(); if(!response.ok)throw new Error(data.error||"حدث خطأ أثناء الاتصال بالمساعد.");
    addChatMessage("assistant",data.answer);document.querySelector("#chat-loading")?.remove();appendChatBubble("assistant",data.answer);
  } catch(error) {
    const message=error instanceof Error?error.message:"تعذر الاتصال بالمساعد.";
    document.querySelector("#chat-loading")?.remove();appendChatBubble("assistant",`⚠️ ${message}`);
  } finally {assistantBusy=false;const button=document.querySelector<HTMLButtonElement>("#send-chat");if(button)button.disabled=false;document.querySelector<HTMLTextAreaElement>("#chat-input")?.focus();}
}
function bind(){
  document.querySelectorAll<HTMLElement>("[data-page]").forEach(el=>el.addEventListener("click",()=>{currentPage=el.dataset.page||"dashboard";searchTerm="";render();}));
  document.querySelector("#quick-add")?.addEventListener("click",()=>openOrderModal());
  document.querySelector("#add-order")?.addEventListener("click",()=>openOrderModal());
  document.querySelectorAll<HTMLElement>("[data-view]").forEach(el=>el.addEventListener("click",()=>showOrder(Number(el.dataset.view))));
  document.querySelector<HTMLInputElement>("#search")?.addEventListener("input",e=>{searchTerm=(e.target as HTMLInputElement).value;const pos=(e.target as HTMLInputElement).selectionStart;render();const input=document.querySelector<HTMLInputElement>("#search");input?.focus();input?.setSelectionRange(pos,pos);});
  document.querySelector<HTMLSelectElement>("#status-filter")?.addEventListener("change",e=>{(window as any).__enjezlyStatusFilter=(e.target as HTMLSelectElement).value;render();});
  document.querySelector("#export-csv")?.addEventListener("click",exportCSV);
  document.querySelector("#stock-add")?.addEventListener("click",()=>alert("إضافة الأصناف وتخزينها ضمن قاعدة بيانات المخزون ستكون ضمن المرحلة التالية."));
  document.querySelector<HTMLFormElement>("#chat-form")?.addEventListener("submit",e=>{e.preventDefault();const input=document.querySelector<HTMLTextAreaElement>("#chat-input");if(input)void sendAssistantMessage(input.value);});
  document.querySelectorAll<HTMLButtonElement>("[data-prompt]").forEach(button=>button.addEventListener("click",()=>void sendAssistantMessage(button.dataset.prompt||"")));
  document.querySelector("#clear-chat")?.addEventListener("click",()=>{if(confirm("بدء محادثة جديدة ومسح سجل المحادثة؟")){assistantMessages=[];localStorage.removeItem("enjezly-ai-chat");render();}});
}
render();