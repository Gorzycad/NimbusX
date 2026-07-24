// // src/components/common/SubscriptionBanner.jsx

// import { useAuth } from "../../contexts/AuthContext";
// import { useEffect, useState } from "react";

// export default function SubscriptionBanner() {
//   const { userData } = useAuth();
//   const [error, setError] = useState("");
  
//   // 🔔 Show alert ONLY once
//   useEffect(() => {
//     if (userData && userData.accessEnabled === false) {
//       setError("Subscription required. Contact your admin or renew yourself.");
//     }
//   }, [userData]);

//   if (!userData || userData.accessEnabled !== false) return null;

//   return (
//     <div
//       style={{
//         background: "#ffdddd",
//         color: "red",
//         padding: "12px",
//         textAlign: "center",
//         fontWeight: "bold",
//         fontSize: 16,
//       }}
//     >
//       🚨 Subscription required. Contact your admin or renew yourself.
//     </div>
//   );
// }

import { useAuth } from "../../contexts/AuthContext";

export default function SubscriptionBanner() {
  const { userData, isDeveloperFreeCompany } = useAuth();
  
  if(isDeveloperFreeCompany){

    return(

        <div
        style={{
            background:"#d4edda",
            color:"#155724",
            padding:12,
            textAlign:"center",
            fontWeight:"bold"
        }}
        >

        🎁 Developer Complimentary Access

        </div>

    );

}
  if (!userData) return null;

  const today = new Date();

  // -------------------------
  // BLOCKED
  // -------------------------
  if (userData.accessEnabled === false) {
    return (
      <div
        style={{
          background: "#ffdddd",
          color: "#b30000",
          padding: 12,
          textAlign: "center",
          fontWeight: "bold",
          fontSize: 16,
        }}
      >
        🚨 Subscription required. Contact your administrator.
      </div>
    );
  }

  // -------------------------
  // TRIAL PERIOD
  // -------------------------
  if (
    userData.subscriptionPhase === "trial" &&
    userData.trialStartDate?.toDate
  ) {
    const trialStart = userData.trialStartDate.toDate();

    const daysUsed = Math.floor(
      (today - trialStart) / (1000 * 60 * 60 * 24)
    );

    const daysRemaining = Math.max(0, 7 - daysUsed);

    return (
      <div
        style={{
          background: "#e8f7ff",
          color: "#005a9c",
          padding: 12,
          textAlign: "center",
          fontWeight: "bold",
          fontSize: 16,
        }}
      >
        🎉 Free Trial: You have <b>{daysRemaining}</b> day
        {daysRemaining !== 1 ? "s" : ""} remaining.
        Please subscribe before your trial expires.
      </div>
    );
  }

  // -------------------------
  // MONTHLY RENEWAL
  // -------------------------
  if (
    userData.subscriptionPhase === "active" &&
    userData.billingStatus === "pending" &&
    today.getDate() <= 5
  ) {
    const daysRemaining = 6 - today.getDate();

    return (
      <div
        style={{
          background: "#fff6d8",
          color: "#9c6a00",
          padding: 12,
          textAlign: "center",
          fontWeight: "bold",
          fontSize: 16,
        }}
      >
        🔔 Subscription renewal is due.
        Please renew within <b>{daysRemaining}</b> day
        {daysRemaining !== 1 ? "s" : ""} to avoid interruption.
      </div>
    );
  }

  return null;
}