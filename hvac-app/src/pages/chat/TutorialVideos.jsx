//src/pages/chat/TutorialVideos.jsx
import React, { useState } from "react";

export default function TutorialsGrid() {
  const [activeVideo, setActiveVideo] = useState(null);

  const videos = [
    {
      title: "Introduction to NimbusX ERP",
      url: "https://drive.google.com/file/d/152-kHdM2K7RTNNjbC7dCsUXbQQl8B-vD/preview",
    },
    {
      title: "Introduction to Project Dashboard",
      url: "https://drive.google.com/file/d/1iRuZl_4YRh3XLqi2Oslusq-1ebkANm3-/preview",
    },
    {
      title: "How to Create a New Lead",
      url: "https://drive.google.com/file/d/1G0oKGAUXnUHlWLkuAl2G1SutnDYHxEpn/preview",
    },
    {
      title: "How to Create a New Tender",
      url: "https://drive.google.com/file/d/10A1nt0UW3W8aaW0Uwp_USIW4SWpEXIrQ/preview",
    },
    {
      title: "How to Create a New Award",
      url: "https://drive.google.com/file/d/122a8SqZ_ACrPPEoAphwkMd-_BhyyJuoB/preview",
    },
    {
      title: "How to use the Design Tab",
      //url: "https://drive.google.com/file/d/VIDEO_ID_5/preview",
    },
    {
      title: "How to Create a New Bill of Quantities",
      url: "https://drive.google.com/file/d/1CN_N2QSYHXsOCbDdFjLjfcvy4vHTtS78/preview",
    },
    {
      title: "How to Create a New Material Takeoff Quantity",
      url: "https://drive.google.com/file/d/16RVJb070uZ2xiPGLY-OPG0S8InPZp2au/preview",
    },
    {
      title: "How to use the Project Execution Tab",
      url: "https://drive.google.com/file/d/1kgsVPQ6Cfx9e1wa139dgJHlzGO6IPrAV/preview",
    },
    {
      title: "How to Create a New Purchase Order",
      url: "https://drive.google.com/file/d/1RoRqWu7ZFFUUQ9ejWW5SbHOqjXM4_XEO/preview",
    },
    {
      title: "How to Create a New Handover Entry",
      url: "https://drive.google.com/file/d/17XmSYNnAIjLZH1jo7Z4N-g8Qs9Hj6gm4/preview",
    },
    {
      title: "How to Create a New Logistics Entry",
      url: "https://drive.google.com/file/d/1R1pEBEPdkvWUSYVdIKkda-mJW5SkeY51/preview",
    },
    {
      title: "How to Create a New Maintenance Entry",
      url: "https://drive.google.com/file/d/1oD5X4mJbsYUJb6DWJ8vqgQ_LDNWywNMf/preview",
    },
    {
      title: "How to use the QA/QC Reports Tab",
      url: "https://drive.google.com/file/d/14TuJbfKdT4tPs3Zxuqi9iEiU537K6cMH/preview",
    },
    {
      title: "How to Create a New Procurement Entry",
      url: "https://drive.google.com/file/d/1XZO_ueyPVzQe4DNAo0imTXfrX-4Y_EGY/preview",
    },
    {
      title: "How to Create a New Finance Entry",
      url: "https://drive.google.com/file/d/1rOZ-aMLTfnDbBOD09bjdA2dwew0tlxWR/preview",
    },
    {
      title: "How to Submit a New Support Ticket",
      url: "https://drive.google.com/file/d/1JdbvSYSa5c3FheMHJ83VomWornoMiojW/preview",
    },
    {
      title: "How to Use the Staff Manager",
      url: "https://drive.google.com/file/d/1jbBPOkK_hQcpYR4W5cLcRMi-xN2XRy7p/preview",
    },
    {
      title: "How to use the Marketplace Tab",
      url: "https://drive.google.com/file/d/1Rm976AOgL4k2OeclcHFgJ2uZXjWziscC/preview",
    },
    {
      title: "How to use the Iventory Tab",
      url: "https://drive.google.com/file/d/1Md1mpQqz9EHwXIgSYgqEwHYBbihlC9FX/preview",
    },
    // ...continue until 30 videos
  ];

  return (
    <div>
      <h3>How to - Tutorials</h3>

      {/* GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 12,
        }}
      >
        {videos.map((video, idx) => (
          <div
            key={idx}
            onClick={() => setActiveVideo(video)}
            style={{
              cursor: "pointer",
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: 8,
              background: "#fff",
            }}
          >
            {/* thumbnail placeholder */}
            <div
              style={{
                height: 140,
                background: "#000",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              ▶ Play
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                fontWeight: 500,
                textAlign: "center",
              }}
            >
              {video.title}
            </div>
          </div>
        ))}
      </div>

      {/* ================= POPUP MODAL ================= */}
      {activeVideo && (
        <div
          onClick={() => setActiveVideo(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "80%",
              height: "80%",
              background: "#000",
              borderRadius: 10,
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* CLOSE BUTTON */}
            <button
              onClick={() => setActiveVideo(null)}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                zIndex: 10,
                background: "red",
                color: "#fff",
                border: "none",
                padding: "5px 10px",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              ✖
            </button>

            {/* VIDEO */}
            <iframe
              title={activeVideo.title}
              src={activeVideo.url}
              width="100%"
              height="100%"
              allow="autoplay"
              style={{ border: "none" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}


// // src/pages/chat/TutorialVideos.jsx
// import React from "react";
// import { Container, Card } from "react-bootstrap";
// import { useAuth } from "../../contexts/AuthContext";
// import "bootstrap/dist/css/bootstrap.min.css";

// export default function TutorialsGrid() {
//   const { user } = useAuth();

//   return (
//     <Container
//       fluid
//       className="d-flex align-items-center justify-content-center"
//       style={{ minHeight: "70vh" }}
//     >
//       <Card
//         className="text-center shadow-sm"
//         style={{ maxWidth: 600, width: "100%" }}
//       >
//         <Card.Body>
//           <Card.Title style={{ fontSize: 26, marginBottom: 12 }}>
//             Tutorial Videos
//           </Card.Title>

//           <Card.Text style={{ fontSize: 16, color: "#555" }}>
//             🚧 This page is currently under development.
//           </Card.Text>

//           <Card.Text style={{ fontSize: 15, color: "#777" }}>
//             Tutorial Videos features will be available soon.
//           </Card.Text>

//           <div
//             style={{
//               marginTop: 20,
//               padding: 12,
//               background: "#f8f9fa",
//               borderRadius: 6,
//               fontSize: 14,
//               color: "#333",
//             }}
//           >
//             Thank you for your patience{user?.displayName ? `, ${user.displayName}` : ""}.
//           </div>
//         </Card.Body>
//       </Card>
//     </Container>
//   );
// }