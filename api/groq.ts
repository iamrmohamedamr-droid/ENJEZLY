type ChatMessage = { role: "user" | "assistant"; content: string };

export async function groqChat(body: any) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { status: 500, data: { error: "مفتاح Groq غير مضبوط. أضف GROQ_API_KEY في ملف البيئة ثم أعد تشغيل المشروع." } };

  const incoming = Array.isArray(body?.messages) ? body.messages : [];
  const messages: ChatMessage[] = incoming
    .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
    .slice(-12)
    .map((m: any) => ({ role: m.role, content: m.content.slice(0, 5000) }));
  if (!messages.length || !messages.some(m => m.role === "user")) {
    return { status: 400, data: { error: "اكتب سؤالك أولاً." } };
  }

  const context = body?.businessContext && typeof body.businessContext === "object" ? body.businessContext : {};
  const systemPrompt = `أنت ENJEZLY AI، المساعد الذكي لنظام إنجزلي لإدارة مكتبات الطباعة والتصوير والاستديوهات. تحدث بالعربية المصرية الواضحة وبأسلوب عملي ومحترم. ساعد في متابعة الطلبات والحسابات وتنظيم العمل وتسعير الطباعة وتقليل الهدر.\n\nقواعد الدقة: بيانات المكتبة المرفقة هي المصدر الوحيد للأرقام الفعلية. لا تخترع طلبات أو مبيعات أو أسماء أو مبالغ. إذا كانت البيانات لا تكفي فقل ذلك بوضوح واطلب المعلومة الناقصة. ميّز بين إجمالي قيمة الطلبات والمبالغ المحصلة والمتبقية؛ ولا تسمِّ إجمالي المبيعات أرباحاً لأن تكلفة الخامات والمصروفات قد لا تكون مسجلة. لا تدّع تنفيذ إضافة أو تعديل أو حذف طلب؛ أنت حالياً مساعد استشاري للقراءة والتحليل فقط ولا تملك صلاحية تغيير سجلات النظام. لا تطلب من المستخدم إرسال مفاتيح API أو كلمات مرور.\n\nملخص بيانات النظام الحالي (قد تكون بيانات تجريبية محفوظة في هذا المتصفح فقط):\n${JSON.stringify(context).slice(0, 14000)}`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        temperature: 0.35,
        max_completion_tokens: 1000
      })
    });
    const payload: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = payload?.error?.message || `Groq API returned ${response.status}`;
      return { status: response.status, data: { error: `تعذر الحصول على رد من Groq: ${detail}` } };
    }
    const answer = payload?.choices?.[0]?.message?.content;
    if (typeof answer !== "string" || !answer.trim()) return { status: 502, data: { error: "وصل رد فارغ من نموذج الذكاء الاصطناعي. جرّب مرة أخرى." } };
    return { status: 200, data: { answer, model: payload.model || process.env.GROQ_MODEL || "openai/gpt-oss-20b" } };
  } catch {
    return { status: 502, data: { error: "تعذر الاتصال بخدمة Groq. تحقق من الإنترنت وحاول مرة أخرى." } };
  }
}
