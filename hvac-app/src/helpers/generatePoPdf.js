//src/helpers/generatePoPdf.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function generatePoPdf({ po, boq, mtoOverride = [], deliveryFee = 0 }) {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("PURCHASE ORDER", 14, 15);

  doc.setFontSize(10);
  doc.text(`PO ID: ${po.poId}`, 14, 25);
  doc.text(`Project: ${po.projectName}`, 14, 32);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 39);

  let y = 65;
  let subtotal = 0;

  doc.setFontSize(11);

  doc.text(
    `Recipient Address: ${po.recipientAddress || "-"}`,
    14,
    45
  );

  doc.text(
    `Recipient Phone: ${po.recipientPhone || "-"}`,
    14,
    52
  );

  const renderSection = (title, items = []) => {
    const validItems = items.filter(
      (r) => Number(r.qty || 0) > 0
    );

    if (!validItems.length) return;

    doc.setFontSize(12);
    doc.text(title.toUpperCase(), 14, y);
    y += 5;

    const body = validItems
      .filter((r) => Number(r.qty || 0) > 0)
      .map((r) => {
        const qty = Number(r.qty || 0);
        const rate = Number(r.rate || 0);
        const total = qty * rate;

        subtotal += total;

        return [
          r.item || r.description || "",
          qty,
          r.unit || "",
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

    y = doc.lastAutoTable.finalY + 10;
  };

  // ✅ use MTO if available
  if (mtoOverride?.length) {
    renderSection("MTO ITEMS", mtoOverride);
  } else {
    renderSection("Mechanical", boq?.mechanical);
    renderSection("Electrical", boq?.electrical);
    renderSection("Plumbing", boq?.plumbing);
  }

  const grandTotal = subtotal + Number(deliveryFee || 0);

  autoTable(doc, {
    startY: y,
    body: [
      [
        { content: "SUBTOTAL", styles: { fontStyle: "bold" } },
        { content: subtotal.toFixed(2), styles: { halign: "right" } },
      ],
    ],
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY,
    body: [
      [
        { content: "DELIVERY FEE", styles: { fontStyle: "bold" } },
        { content: deliveryFee.toFixed(2), styles: { halign: "right" } },
      ],
    ],
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY,
    body: [
      [
        { content: "TOTAL PAYABLE", styles: { fontStyle: "bold" } },
        {
          content: grandTotal.toFixed(2),
          styles: { halign: "right", fontStyle: "bold" },
        },
      ],
    ],
  });

  doc.save(`${po.poId}.pdf`);
}
