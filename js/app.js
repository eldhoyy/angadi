/* Shared init that runs on every page, after data.js is loaded */
document.addEventListener("DOMContentLoaded", async function () {
  updateCartBadge();

  const searchForm = document.getElementById("navSearchForm");
  if (searchForm) {
    searchForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const q = document.getElementById("navSearchInput").value.trim();
      window.location.href = "index.html" + (q ? "?q=" + encodeURIComponent(q) : "");
    });
  }

  const accountLink = document.getElementById("accountLink");
  if (accountLink) {
    try {
      const session = await getSessionProfile();
      if (session) {
        accountLink.textContent = session.name.split(" ")[0];
        accountLink.href = session.role === "customer" ? "index.html"
                          : session.role === "supplier" ? "supplier-dashboard.html"
                          : "admin-dashboard.html";
      } else {
        accountLink.textContent = "Login";
        accountLink.href = "login.html";
      }
    } catch (e) {
      accountLink.textContent = "Login";
      accountLink.href = "login.html";
    }
  }
});

async function logout() {
  await signOut();
  toast("Logged out");
  setTimeout(() => (window.location.href = "index.html"), 500);
}

// Call from a dashboard page's init: const session = await requireRole("supplier");
async function requireRole(role) {
  try {
    const session = await getSessionProfile();
    if (!session || session.role !== role) {
      window.location.href = "login.html";
      return null;
    }
    return session;
  } catch (e) {
    window.location.href = "login.html";
    return null;
  }
}

function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}
