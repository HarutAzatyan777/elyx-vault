export const NOTE_CATEGORIES = [
  { id: 'All', label: 'Բոլորը (All)', icon: '📁', color: '#6366f1' },
  { id: 'Work', label: 'Աշխատանք (Work)', icon: '💼', color: '#3b82f6' },
  { id: 'Tasks', label: 'Tasks (Գործեր)', icon: '⚡', color: '#10b981' },
  { id: 'Code', label: 'Կոդ (Dev)', icon: '💻', color: '#8b5cf6' },
  { id: 'Ideas', label: 'Գաղափարներ (Ideas)', icon: '💡', color: '#f59e0b' },
  { id: 'Personal', label: 'Անձնական (Personal)', icon: '👤', color: '#ec4899' },
];

export const NOTE_TEMPLATES = [
  {
    id: 'meeting',
    name: '🤝 Հանդիպման Արձանագրություն (Meeting Notes)',
    category: 'Work',
    snippet: `# 🤝 Հանդիպման Արձանագրություն

**Ամսաթիվ:** ${new Date().toLocaleDateString('hy-AM', { year: 'numeric', month: 'long', day: 'numeric' })}
**Մասնակիցներ:** 
- [ ] 
- [ ] 

---

### 🎯 Օրակարգ (Agenda)
1. Քննարկվող հարց 1
2. Քննարկվող հարց 2
3. Հետագա քայլեր

### 📝 Գլխավոր Կետեր & Քննարկում
- 
- 

### ✅ Որոշումներ & Action Items
- [ ] **Առաջադրանք 1** - Պատասխանատու: 
- [ ] **Առաջադրանք 2** - Վերջնաժամկետ: 
`,
  },
  {
    id: 'sprint_tasks',
    name: '⚡ Օրվա & Sprint Առաջադրանքներ (Task Board)',
    category: 'Tasks',
    snippet: `# ⚡ Sprint & Daily Checklist

### 🚨 Բարձր Առաջնահերթություն (High Priority)
- [ ] 
- [ ] 

### ⚙️ Ընթացքի Մեջ (In Progress)
- [ ] 
- [ ] 

### 🧪 Ստուգման Ենթակա (Testing / Review)
- [ ] 

### 💡 Գաղափարներ & Նշումներ
> 
`,
  },
  {
    id: 'tech_spec',
    name: '💻 Տեխնիկական Նախագիծ (Tech Spec / Snippet)',
    category: 'Code',
    snippet: `# 💻 Տեխնիկական Փաստաթուղթ / Architecture

### 📌 Նպատակը (Objective)
Նկարագրեք մոդուլի կամ API-ի նպատակը:

### 📐 Տվյալների Մոդել & Schema
\`\`\`typescript
interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'developer' | 'viewer';
  createdAt: string;
}
\`\`\`

### 🚀 Իրականացման Քայլեր
- [ ] Կարգավորել API endpoint-ը
- [ ] Ավելացնել validation ստուգումներ
- [ ] Ծածկել Unit թեստերով
`,
  },
  {
    id: 'bug_report',
    name: '🐛 Խնդրի Հետազոտում (Bug Report / Postmortem)',
    category: 'Work',
    snippet: `# 🐛 Խնդրի Հետազոտում (Bug Investigation)

**Հայտնաբերված է:** ${new Date().toLocaleDateString()}
**Ստատուս:** 🔍 Ուսումնասիրվում է

### ⚠️ Ախտանշաններ (Symptoms)
Ի՞նչ է տեղի ունենում սխալի ժամանակ:

### 🔁 Կրկնման Քայլեր (Steps to Reproduce)
1. Բացել էջը
2. Սեղմել կոճակը
3. Ստանալ սխալի կոդը:

### 🧩 Լուծման Տարբերակներ
- [ ] Տարբերակ A
- [ ] Տարբերակ B
`,
  },
  {
    id: 'encrypted_vault',
    name: '🔐 Գաղտնի Բանալիներ (Encrypted Vault Data)',
    category: 'Work',
    snippet: `# 🔐 Գաղտնի Տվյալների Պահոց (Master Password Protected)

> ⚠️ Այս նոթը գաղտնագրված է AES-256 ալգորիթմով: Տվյալները պահպանվում են միայն կոդավորված տեսքով:

### 🔑 API Keys & Գաղտնաբառեր
- **Production Secret:** \`sk_live_...\`
- **SSH Private Key Alias:** \`id_ed25519\`
- **Database Connection String:** \`postgres://user:pass@host:5432/db\`

### 🛡️ Անվտանգության Նշումներ
- Չտարածել Master Password-ը
- Պարբերաբար թարմացնել գաղտնաբառերը
`,
  },
];
