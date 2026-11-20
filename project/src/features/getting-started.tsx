"use client";
import type { WorkspaceSnapshot } from "../domain/model";
import { copy } from "../i18n";
const titles = {
 en: { heading: "Getting started", customer: "Add your first customer", document: "Create your first invoice or quotation", backup: "Choose backup and sharing", hint: "Cloud sharing is optional. Records remain on this device until you enable it." },
 si: { heading: "ආරම්භ කරමු", customer: "පළමු පාරිභෝගිකයා එක් කරන්න", document: "පළමු ඉන්වොයිසිය හෝ මිල ගණන සාදන්න", backup: "උපස්ථ හා බෙදාගැනීම තෝරන්න", hint: "වලාකුළු බෙදාගැනීම විකල්පයකි. එය සක්‍රීය කරන තුරු වාර්තා මෙම උපාංගයේ පවතී." },
 ta: { heading: "தொடங்குவோம்", customer: "முதல் வாடிக்கையாளரைச் சேர்க்கவும்", document: "முதல் விலைப்பட்டியல் அல்லது விலைமதிப்பீட்டை உருவாக்கவும்", backup: "காப்புப்பிரதி மற்றும் பகிர்வைத் தேர்ந்தெடுக்கவும்", hint: "கிளவுட் பகிர்வு விருப்பமானது. அதை இயக்கும் வரை பதிவுகள் இந்தச் சாதனத்தில் இருக்கும்." },
};
export function GettingStarted({ data, onNavigate }: { data: WorkspaceSnapshot; onNavigate: (screen: string) => void }) {
 const text=titles[data.business.language], t=copy(data.business.language);
 return <section className="panel" aria-label={text.heading} style={{marginBottom:20}}>
   <h2>{text.heading}</h2>
   <p>{text.hint}</p>
   <div className="grid2">
     <div><p>{data.customers.length} {t.customers}</p><button className="btn" onClick={()=>onNavigate("customers")}>{data.customers.length?t.customers:text.customer}</button></div>
     <div><p>{data.documents.length} {t.documents}</p><button className="btn" onClick={()=>onNavigate("documents")}>{data.documents.length?t.documents:text.document}</button></div>
   </div>
   <button className="btn" style={{marginTop:16}} onClick={()=>onNavigate("backup")}>{text.backup}</button>
 </section>;
}
