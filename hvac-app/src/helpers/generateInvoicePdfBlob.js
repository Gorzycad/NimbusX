import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function generateInvoicePdfBlob({ po, boq }) {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("INVOICE", 14, 20);

  doc.setFontSize(10);
  doc.text(`PO ID: ${po.poId}`, 14, 28);
  doc.text(`Project: ${po.projectName}`, 14, 34);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 40);

  let y = 50;
  let grandTotal = 0;

  const renderSection = (title, rows) => {
    if (!rows?.length) return 0;

    doc.setFontSize(12);
    doc.text(title.toUpperCase(), 14, y);
    y += 5;

    let sectionTotal = 0;

    const body = rows.map((r) => {
      const qty = Number(r.qty) || 0;
      const rate = Number(r.rate) || 0;
      const total = qty * rate;
      sectionTotal += total;

      return [
        r.item,
        qty,
        r.unit,
        rate.toFixed(2),
        total.toFixed(2),
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [["Item", "Qty", "Unit", "Rate", "Total"]],
      body,
      theme: "grid",
      styles: { fontSize: 9 },
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY,
      body: [[
        { content: "SECTION TOTAL", colSpan: 4, styles: { halign: "right", fontStyle: "bold" } },
        { content: sectionTotal.toFixed(2), styles: { halign: "right", fontStyle: "bold" } },
      ]],
      theme: "grid",
    });

    y = doc.lastAutoTable.finalY + 10;
    return sectionTotal;
  };

  grandTotal += renderSection("Mechanical", boq.mechanical);
  grandTotal += renderSection("Electrical", boq.electrical);
  grandTotal += renderSection("Plumbing", boq.plumbing);

  autoTable(doc, {
    startY: y,
    body: [[
      { content: "TOTAL AMOUNT PAYABLE", styles: { fontStyle: "bold" } },
      { content: grandTotal.toFixed(2), styles: { halign: "right", fontStyle: "bold" } },
    ]],
    theme: "grid",
  });

  // 🔑 RETURN BLOB INSTEAD OF SAVING
  return doc.output("blob");
}

