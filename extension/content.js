// content.js - Intercepts passwords and checks domain risks

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

document.addEventListener("submit", async (event) => {
    const passwordField = event.target.querySelector("input[type='password']");
    if (passwordField) {
        event.preventDefault(); // Pause submission

        const password = passwordField.value;
        const hashedHex = await hashPassword(password);

        try {
            const response = await fetch("http://localhost:8000/api/v1/guard/check-password", {
                method: "POST",
                body: JSON.stringify({ password_hash: hashedHex }),
                headers: { "Content-Type": "application/json" }
            });
            const result = await response.json();

            if (result.status === "leaked" && result.risk === "critical") {
                alert("⚠ EchoVault Guard:\nUnsafe password detected.\nThis password has appeared in dark web leaks.\nSubmission blocked.");
                // We keep it blocked by NOT resubmitting
            } else {
                console.log("Password safe.");
                event.target.submit(); // Pass through
            }
        } catch (error) {
            console.error("EchoVault backend offline. Allowing submission.", error);
            event.target.submit();
        }
    }
});

const currentDomain = window.location.hostname;

// For easy testing without needing Tor, we allow passing ?mock_domain=... in the URL
const searchParams = new URL(window.location.href).searchParams;
const domainToCheck = searchParams.get('mock_domain') || currentDomain;

if (domainToCheck.endsWith('.onion')) {
    fetch("http://localhost:8000/api/v1/guard/check-domain", {
        method: "POST",
        body: JSON.stringify({ domain: domainToCheck }),
        headers: { "Content-Type": "application/json" }
    }).then(r => r.json()).then(result => {
        if (result.risk_level === "critical") {
            const overlay = document.createElement("div");
            overlay.innerHTML = "<h1 style='color:#ef4444; font-family: sans-serif; font-size: 40px; text-transform: uppercase;'>Deceptive Site Ahead</h1>" +
                "<p style='font-size:18px;'>EchoVault blocked this domain due to: <strong>" + result.reason + "</strong></p>";
            overlay.setAttribute("style", "position:fixed; top:0; left:0; width:100%; height:100%; background:#0f172a; color:#f8fafc; z-index:9999999; display:flex; flex-direction:column; align-items:center; justify-content:center;");
            document.body.appendChild(overlay);
        }
    }).catch(e => console.error(e));
}
