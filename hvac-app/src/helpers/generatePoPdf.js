import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";


export function generatePoPdf({ po, boq }) {
    const doc = new jsPDF();

    // ---------- HEADER ----------
    doc.setFontSize(16);
    doc.text("PURCHASE ORDER", 14, 15);

    doc.setFontSize(10);
    doc.text(`PO ID: ${po.poId}`, 14, 25);
    doc.text(`Project: ${po.projectName}`, 14, 32);
    doc.text(`BOQ: ${boq.title}`, 14, 39);
    doc.text(
        `Date: ${new Date().toLocaleDateString()}`,
        14,
        46
    );

    let y = 55;

    // ---------- TABLE RENDER ----------
    const renderSection = (title, rows) => {
        if (!rows?.length) return;

        doc.setFontSize(12);
        doc.text(title.toUpperCase(), 14, y);
        y += 4;

        let sectionTotal = 0;

        const body = rows.map((r) => {
            const qty = Number(r.qty) || 0;
            const rate = Number(r.rate) || 0;
            const total = r.total ? Number(r.total) : qty * rate;

            sectionTotal += total;

            return [
                r.item || "",
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
            styles: { fontSize: 9 },
            theme: "grid",
            headStyles: { fillColor: [230, 230, 230] },
            columnStyles: {
                1: { halign: "right" },
                3: { halign: "right" },
                4: { halign: "right" },
            },
        });

        // 🔹 GRAND TOTAL ROW
        autoTable(doc, {
            startY: doc.lastAutoTable.finalY,
            body: [[
                { content: "SECTION TOTAL", colSpan: 4, styles: { halign: "right", fontStyle: "bold" } },
                { content: sectionTotal.toFixed(2), styles: { fontStyle: "bold", halign: "right" } },
            ]],
            theme: "grid",
            styles: { fontSize: 10 },
        });

        y = doc.lastAutoTable.finalY + 10;

    };


    renderSection("Mechanical", boq.mechanical);
    renderSection("Electrical", boq.electrical);
    renderSection("Plumbing", boq.plumbing);

    // ---------- SAVE ----------
    doc.save(`${po.poId}.pdf`);
}
