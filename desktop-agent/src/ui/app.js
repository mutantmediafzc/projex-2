// Sign-in and monitoring notice window.
const $ = (id) => document.getElementById(id);
const views = ["login", "notice", "done"];

function showMessage(text, tone = "error") {
  const el = $("message");
  if (!text) {
    el.className = "msg hidden";
    return;
  }
  el.className = `msg ${tone}`;
  el.textContent = text;
}

function show(view) {
  for (const v of views) $(`view-${v}`).classList.toggle("hidden", v !== view);
}

async function renderNotice(requireConsent) {
  show("notice");
  $("subtitle").textContent = requireConsent ? "Please review before tracking starts" : "What is recorded";
  const notice = await window.tracker.getNotice();
  $("n-when").textContent = notice.when;
  $("n-who").textContent = notice.who;
  $("n-retention").textContent = notice.retention;
  $("n-version").textContent = notice.policyVersion || "-";
  const list = $("n-items");
  list.replaceChildren(
    ...notice.items.map((text) => {
      const li = document.createElement("li");
      li.textContent = text;
      return li;
    }),
  );
  const needsConsent = requireConsent || !notice.accepted;
  $("consent-actions").classList.toggle("hidden", !needsConsent);
  $("notice-actions").classList.toggle("hidden", needsConsent);
}

async function go(view, message) {
  showMessage(message || "", message ? "warn" : "error");
  if (view === "consent") return renderNotice(true);
  if (view === "notice") return renderNotice(false);
  if (view === "done") {
    $("subtitle").textContent = "Signed in";
    return show("done");
  }
  $("subtitle").textContent = "Sign in with your CRM account";
  show("login");
  $("email").focus();
}

$("view-login").addEventListener("submit", async (event) => {
  event.preventDefault();
  const btn = $("login-btn");
  btn.disabled = true;
  btn.textContent = "Signing in...";
  showMessage("");
  try {
    const result = await window.tracker.login($("email").value, $("password").value);
    $("password").value = "";
    await go(result.consentAccepted ? "done" : "consent");
  } catch (err) {
    showMessage(String(err.message || err).replace(/^Error invoking remote method '[^']+': (Error: )?/, ""));
  } finally {
    btn.disabled = false;
    btn.textContent = "Sign in";
  }
});

$("accept-btn").addEventListener("click", async () => {
  const btn = $("accept-btn");
  btn.disabled = true;
  try {
    await window.tracker.acceptNotice();
    await go("done");
  } catch (err) {
    showMessage(String(err.message || err).replace(/^Error invoking remote method '[^']+': (Error: )?/, ""));
  } finally {
    btn.disabled = false;
  }
});

$("signout-btn").addEventListener("click", () => window.tracker.signOut());
$("close-btn").addEventListener("click", () => window.tracker.close());
$("done-btn").addEventListener("click", () => window.tracker.close());

window.tracker.onView(({ view, message }) => go(view, message));

const params = new URLSearchParams(location.search);
go(params.get("view") || "login", params.get("message") || "");
