"use client";

import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { Document as DocxDocument, Packer, Paragraph, TextRun } from "docx";
import html2canvas from "html2canvas";
import { AuditEntry, RequestItem } from "@/types";

const loadImageAsDataUrl = async (path: string) => {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Image not found: ${path}`);
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const exportPdf = async (request: RequestItem) => {
  const doc = new jsPDF("p", "mm", "a4");
  const statusAr: Record<RequestItem["status"], string> = {
    "Draft": "مسودة",
    "Pending Review": "بانتظار المراجعة",
    "Approved": "موافق عليه",
    "Rejected": "مرفوض",
    "Archived": "مؤرشف",
  };

  let logo = "";
  try {
    logo = await loadImageAsDataUrl("/iraq-takaful-logo.jpeg");
  } catch {}

  let barcodeData = "";
  try {
    barcodeData = await loadImageAsDataUrl("/barcode.png");
  } catch {
    barcodeData = await QRCode.toDataURL(`${request.requestId}|${request.status}|${request.amount}`);
  }

  const el = document.createElement("div");
  el.setAttribute("dir", "rtl");
  el.style.width = "760px";
  el.style.background = "#f8fafc";
  el.style.color = "#0f172a";
  el.style.fontFamily = "Cairo, Tahoma, Arial, sans-serif";
  el.style.padding = "0";
  el.innerHTML = `
    <div style="background:#0038a8;color:#fff;padding:18px 22px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="font-size:28px;font-weight:700;">شركة تكافل العراق - مستند طلب داخلي</div>
        <div style="font-size:15px;margin-top:8px;">تاريخ التصدير: ${new Date().toLocaleString("ar-IQ")}</div>
        <div style="font-size:15px;margin-top:4px;">رقم الطلب بالنظام: ${request.requestId}</div>
      </div>
      ${logo ? `<img src="${logo}" style="width:130px;height:75px;object-fit:contain;background:#fff;padding:6px;border-radius:6px;" />` : ""}
    </div>
    <div style="padding:18px 22px;">
      <div style="display:flex;gap:16px;align-items:flex-start;">
        <div style="flex:1;border:1px solid #cbd5e1;border-radius:10px;padding:12px 14px;background:#fff;">
          <div style="font-size:22px;font-weight:700;margin-bottom:8px;">ملخص الطلب</div>
          <div style="line-height:1.95;font-size:16px;">
            <div><b>رقم الطلب:</b> ${request.requestId}</div>
            <div><b>العنوان:</b> ${request.title}</div>
            <div><b>الحالة:</b> ${statusAr[request.status]}</div>
            <div><b>نوع الطلب:</b> ${request.requestType}</div>
            <div><b>الأولوية:</b> ${request.priority}</div>
            <div><b>اسم الموظف:</b> ${request.employeeName}</div>
            <div><b>القسم:</b> ${request.department}</div>
            <div><b>المبلغ:</b> ${request.amount.toLocaleString()} ${request.currency}</div>
            <div><b>تاريخ الإنشاء:</b> ${new Date(request.createdAt).toLocaleString("ar-IQ")}</div>
            <div><b>آخر تحديث:</b> ${new Date(request.updatedAt).toLocaleString("ar-IQ")}</div>
          </div>
        </div>
        <div style="width:160px;text-align:center;">
          <img src="${barcodeData}" style="width:150px;height:150px;background:#fff;padding:8px;border:1px solid #e2e8f0;border-radius:8px;" />
          <div style="font-size:12px;color:#334155;margin-top:6px;">رمز التحقق</div>
        </div>
      </div>
      <div style="margin-top:16px;border:1px solid #cbd5e1;border-radius:10px;padding:12px 14px;background:#fff;">
        <div style="font-size:22px;font-weight:700;margin-bottom:8px;">تفاصيل الطلب</div>
        <div style="font-size:16px;line-height:1.95;">${request.description || "-"}</div>
      </div>
      <div style="margin-top:16px;border:1px solid #cbd5e1;border-radius:10px;padding:12px 14px;background:#fff;">
        <div style="font-size:22px;font-weight:700;margin-bottom:8px;">المرفقات والملاحظات</div>
        <div style="font-size:15px;line-height:1.9;"><b>المرفقات:</b> ${request.attachments.length ? request.attachments.join(" ، ") : "لا يوجد"}</div>
        <div style="font-size:15px;line-height:1.9;"><b>الملاحظات:</b> ${request.notes.length ? request.notes.join(" | ") : "لا يوجد"}</div>
      </div>
      <div style="margin-top:18px;display:flex;justify-content:space-between;">
        <div style="width:45%;border-top:1px solid #64748b;padding-top:8px;font-size:12px;">توقيع مقدم الطلب</div>
        <div style="width:45%;border-top:1px solid #64748b;padding-top:8px;font-size:12px;">
          توقيع جهة الموافقة
          <div style="margin-top:6px;font-size:11px;color:#334155;">
            ${request.approvalSignature
              ? `المعتمد: ${request.approvalSignature.approvedBy} (${request.approvalSignature.approvedRole})<br/>التاريخ: ${new Date(request.approvalSignature.approvedAt).toLocaleString("ar-IQ")}<br/>التوقيع: ${request.approvalSignature.signatureText}`
              : "غير معتمد بعد"}
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(el);
  if ("fonts" in document) {
    await (document as Document & { fonts: FontFaceSet }).fonts.ready;
  }
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#f8fafc",
  });
  document.body.removeChild(el);

  const imgData = canvas.toDataURL("image/png");
  const pageWidth = 210;
  const pageHeight = 297;
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;
  doc.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    doc.addPage();
    doc.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  doc.save(`${request.requestId}.pdf`);
};

export const exportDocx = async (request: RequestItem) => {
  const doc = new DocxDocument({
    sections: [{
      children: [
        new Paragraph({ children: [new TextRun({ text: "ACS Enterprise Request", bold: true, size: 36 })] }),
        new Paragraph(`Request ID: ${request.requestId}`),
        new Paragraph(`Title: ${request.title}`),
        new Paragraph(`Status: ${request.status}`),
        new Paragraph(`Description: ${request.description}`),
      ],
    }],
  });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${request.requestId}.docx`;
  a.click();
  URL.revokeObjectURL(url);
};

const downloadTextFile = (name: string, content: string, mime = "text/plain;charset=utf-8;") => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportRequestsCsv = (requests: RequestItem[]) => {
  const header = [
    "requestId",
    "title",
    "status",
    "requestType",
    "priority",
    "employeeName",
    "department",
    "amount",
    "currency",
    "createdAt",
    "updatedAt",
  ];

  const escapeCsv = (value: string | number) => `"${String(value).replace(/"/g, "\"\"")}"`;
  const rows = requests.map((r) => [
    r.requestId,
    r.title,
    r.status,
    r.requestType,
    r.priority,
    r.employeeName,
    r.department,
    r.amount,
    r.currency,
    r.createdAt,
    r.updatedAt,
  ]);

  const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
  downloadTextFile(`acs-requests-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv;charset=utf-8;");
};

export const exportKpiReport = (title: string, lines: string[]) => {
  const content = [`${title}`, `Generated: ${new Date().toLocaleString()}`, "", ...lines].join("\n");
  downloadTextFile(`acs-kpi-${new Date().toISOString().slice(0, 10)}.txt`, content);
};

export const exportAuditCsv = (logs: AuditEntry[]) => {
  const header = ["at", "actor", "role", "action", "requestCode", "details"];
  const escapeCsv = (value: string | number) => `"${String(value).replace(/"/g, "\"\"")}"`;
  const rows = logs.map((l) => [l.at, l.actor, l.role, l.action, l.requestCode || "", l.details]);
  const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
  downloadTextFile(`acs-audit-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv;charset=utf-8;");
};
